// app.js

// 1. FIREBASE IMPORTS (Added Storage module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getStorage, ref as fbRef, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

// 2. FIREBASE CONFIGURATION
const firebaseConfig = {
    apiKey: "YOUR_API_KEY", // Update these
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp); 
const storage = getStorage(firebaseApp);

// 3. VUE APP INIT
const { createApp, ref, computed, nextTick, onMounted } = window.Vue;

createApp({
    setup() {
        const isUnlocked = ref(false);
        const loggedInUser = ref('');
        const emailInput = ref('');
        const passwordInput = ref('');
        const authError = ref('');
        const activeTab = ref('Search');

        // Simple auth for now
        const handleLogin = () => {
            authError.value = '';
            signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value)
                .then(() => { emailInput.value = ''; passwordInput.value = ''; refreshIcons(); })
                .catch(() => { authError.value = "Invalid email or password."; });
        };
        const forceLock = () => { signOut(auth).then(() => { isUnlocked.value = false; loggedInUser.value = ''; }); };

        onMounted(() => {
            refreshIcons();
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    loggedInUser.value = user.email.split('@')[0];
                    isUnlocked.value = true;
                } else {
                    isUnlocked.value = false;
                }
            });
        });

        const refreshIcons = () => { nextTick(() => { if(window.lucide) window.lucide.createIcons(); }); };
        const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(val) || 0);

        // --- UPLOAD & MAPPING LOGIC ---
        const standardHeaders = ['-- Ignore --', 'Transaction Date', 'GL Code', 'Description', 'Amount', 'Location', 'Reference ID'];
        const rawPastedGrid = ref([]);
        const mappedHeaders = ref([]);
        const uploadMonth = ref('');
        const isUploading = ref(false);

        const handleRawUpload = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            // PapaParse reads the local file instantly
            Papa.parse(file, {
                complete: (results) => {
                    if(results.data.length < 2) return alert("File appears empty.");
                    rawPastedGrid.value = results.data;
                    
                    // Auto-guess headers
                    const firstRow = results.data[0];
                    mappedHeaders.value = firstRow.map(h => {
                        const hLow = (h || '').toLowerCase();
                        if(hLow.includes('date') || hLow.includes('dt')) return 'Transaction Date';
                        if(hLow.includes('gl') || hLow.includes('account')) return 'GL Code';
                        if(hLow.includes('desc')) return 'Description';
                        if(hLow.includes('amt') || hLow.includes('amount') || hLow.includes('owed')) return 'Amount';
                        if(hLow.includes('loc') || hLow.includes('store')) return 'Location';
                        if(hLow.includes('ref') || hLow.includes('trx')) return 'Reference ID';
                        return '-- Ignore --';
                    });
                }
            });
        };

        const processAndUploadToCloud = async () => {
            if (!uploadMonth.value) return alert("Please select the Target Year/Month for this file before uploading.");
            if (rawPastedGrid.value.length < 2) return;

            isUploading.value = true;
            try {
                // 1. Rebuild the CSV using ONLY mapped columns
                const cleanData = [];
                // Add the header row
                const activeHeaders = mappedHeaders.value.filter(h => h !== '-- Ignore --');
                cleanData.push(activeHeaders);

                // Add the data rows
                for (let r = 1; r < rawPastedGrid.value.length; r++) {
                    const rawRow = rawPastedGrid.value[r];
                    if(!rawRow || rawRow.length === 0 || !rawRow[0]) continue; // Skip empty rows
                    
                    const cleanRow = [];
                    let hasData = false;
                    
                    for (let c = 0; c < mappedHeaders.value.length; c++) {
                        if (mappedHeaders.value[c] !== '-- Ignore --') {
                            const val = rawRow[c] || '';
                            cleanRow.push(val);
                            if(val.trim() !== '') hasData = true;
                        }
                    }
                    if(hasData) cleanData.push(cleanRow);
                }

                // 2. Convert back to CSV string using PapaParse
                const csvString = Papa.unparse(cleanData);

                // 3. Upload to Firebase Storage
                const fileName = `master_csvs/${uploadMonth.value.replace('-', '_')}_master.csv`; // e.g., 2024_01_master.csv
                const fileRef = fbRef(storage, fileName);
                
                await uploadString(fileRef, csvString, 'raw', { contentType: 'text/csv' });
                
                alert(`Success! Standardized CSV saved to cloud as ${fileName}`);
                rawPastedGrid.value = [];
                uploadMonth.value = '';
                
            } catch (error) {
                console.error("Upload Error:", error);
                alert("Failed to upload to Firebase Storage. Check console.");
            }
            isUploading.value = false;
        };

        // --- SEARCH ENGINE LOGIC ---
        const searchMonth = ref('');
        const searchGL = ref('');
        const searchQuery = ref('');
        const isSearching = ref(false);
        const searchResults = ref([]);
        
        const searchTotal = computed(() => {
            return searchResults.value.reduce((sum, row) => sum + (parseFloat(String(row['Amount']).replace(/[^0-9.-]+/g,"")) || 0), 0);
        });

        // In-memory cache so we don't re-download the same month twice
        const fileCache = {}; 

        const runSearch = async () => {
            if (!searchMonth.value) return alert("Please select a month to search.");
            
            isSearching.value = true;
            searchResults.value = [];
            
            const targetFileName = `master_csvs/${searchMonth.value.replace('-', '_')}_master.csv`;
            let csvDataToSearch = [];

            try {
                // 1. Check cache or Download
                if (fileCache[targetFileName]) {
                    csvDataToSearch = fileCache[targetFileName];
                } else {
                    const fileRef = fbRef(storage, targetFileName);
                    const downloadUrl = await getDownloadURL(fileRef);
                    
                    // Fetch and parse the CSV string
                    const response = await fetch(downloadUrl);
                    const csvText = await response.text();
                    
                    const parseResult = Papa.parse(csvText, { header: true, skipEmptyLines: true });
                    csvDataToSearch = parseResult.data;
                    fileCache[targetFileName] = csvDataToSearch; // Save to cache
                }

                // 2. Filter the data in memory
                const glFilter = searchGL.value.trim().toLowerCase();
                const textFilter = searchQuery.value.trim().toLowerCase();

                searchResults.value = csvDataToSearch.filter(row => {
                    let matchesGL = true;
                    let matchesText = true;

                    if (glFilter) {
                        matchesGL = (row['GL Code'] || '').toLowerCase().includes(glFilter);
                    }
                    if (textFilter) {
                        const desc = (row['Description'] || '').toLowerCase();
                        const refId = (row['Reference ID'] || '').toLowerCase();
                        matchesText = desc.includes(textFilter) || refId.includes(textFilter);
                    }

                    return matchesGL && matchesText;
                });

            } catch (error) {
                if (error.code === 'storage/object-not-found') {
                    alert(`No historical data found for ${searchMonth.value}. Please import it first.`);
                } else {
                    console.error("Search error:", error);
                    alert("An error occurred while fetching the data.");
                }
            }

            isSearching.value = false;
        };

        return {
            isUnlocked, loggedInUser, emailInput, passwordInput, authError, handleLogin, forceLock, activeTab,
            standardHeaders, rawPastedGrid, mappedHeaders, uploadMonth, isUploading, handleRawUpload, processAndUploadToCloud,
            searchMonth, searchGL, searchQuery, isSearching, searchResults, searchTotal, runSearch, formatCurrency
        };
    }
}).mount('#app');
