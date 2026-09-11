// app.js

// 1. FIREBASE IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getStorage, ref as fbRef, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

// 2. FIREBASE CONFIGURATION (Matches your Promo Tracker project)
const firebaseConfig = {
    apiKey: "AIzaSyAslKhO_Wn2l1paJkqWj5lhxX_2YSekynk",
    authDomain: "rredco-database.firebaseapp.com",
    projectId: "rredco-database",
    storageBucket: "rredco-database.firebasestorage.app",
    messagingSenderId: "968362680607",
    appId: "1:968362680607:web:dea3fe719d8f8d619fbe8a",
    measurementId: "G-PGY27N2N17"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp); 
const storage = getStorage(firebaseApp);

// 3. VUE APP INIT
const { createApp, ref, computed, nextTick, onMounted } = window.Vue;

createApp({
    setup() {
        // SET TO TRUE TO BYPASS LOGIN DURING LOCAL TESTING
        const isUnlocked = ref(true); 
        const loggedInUser = ref('Local Testing Mode');
        const emailInput = ref('');
        const passwordInput = ref('');
        const authError = ref('');
        const activeTab = ref('Import'); // Default to Import tab so you can load your sample CSV immediately

        const systemUsers = {
            'lenay@rredco.com': { name: 'Lenay A.' },
            'tricia@rredco.com': { name: 'Tricia K.' },
            'whitney@rredco.com': { name: 'Whitney M.' },
            'nicholas.grace@rredco.com': { name: 'Nicholas G.' } 
        };

        const handleLogin = () => {
            authError.value = '';
            signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value)
                .then(() => { emailInput.value = ''; passwordInput.value = ''; refreshIcons(); })
                .catch(() => { authError.value = "Invalid email or password."; });
        };
        
        const forceLock = () => { 
            signOut(auth).then(() => { 
                isUnlocked.value = false; 
                loggedInUser.value = ''; 
            }); 
        };

        onMounted(() => {
            refreshIcons();
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    const userEmail = user.email.toLowerCase();
                    const managerData = systemUsers[userEmail] || { name: user.email.split('@')[0] };
                    loggedInUser.value = managerData.name;
                    isUnlocked.value = true;
                }
            });
        });

        const refreshIcons = () => { nextTick(() => { if(window.lucide) window.lucide.createIcons(); }); };
        const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(val) || 0);

        // --- UPLOAD & MAPPING LOGIC ---
        const standardHeaders = ['-- Ignore --', 'Transaction Date', 'GL Code', 'Description', 'Amount', 'Location', 'Reference ID'];
        const rawPastedGrid = ref([]);
        const mappedHeaders = ref([]);
        const uploadMonth = ref(new Date().toISOString().slice(0, 7)); // Defaults to current YYYY-MM
        const isUploading = ref(false);

        // Local Memory Store (Replaces cloud storage while testing)
        const localHistoricalDatabase = ref(JSON.parse(localStorage.getItem('localHistoricalDatabase')) || {});

        const handleRawUpload = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            // PapaParse reads the local file instantly in browser memory
            Papa.parse(file, {
                complete: (results) => {
                    if(results.data.length < 2) return alert("File appears empty or invalid.");
                    rawPastedGrid.value = results.data;
                    
                    // Smart-guess header mappings for GP Power Online exports
                    const firstRow = results.data[0];
                    mappedHeaders.value = firstRow.map(h => {
                        const hLow = (h || '').toLowerCase();
                        if(hLow.includes('date') || hLow.includes('dt') || hLow.includes('trx_dt')) return 'Transaction Date';
                        if(hLow.includes('gl') || hLow.includes('account') || hLow.includes('actnum')) return 'GL Code';
                        if(hLow.includes('desc') || hLow.includes('dscrptn')) return 'Description';
                        if(hLow.includes('amt') || hLow.includes('amount') || hLow.includes('debit') || hLow.includes('credit')) return 'Amount';
                        if(hLow.includes('loc') || hLow.includes('store') || hLow.includes('site')) return 'Location';
                        if(hLow.includes('ref') || hLow.includes('trx') || hLow.includes('num') || hLow.includes('doc')) return 'Reference ID';
                        return '-- Ignore --';
                    });
                    refreshIcons();
                }
            });
        };

        const processAndUploadToCloud = async () => {
            if (!uploadMonth.value) return alert("Please select the Target Year/Month for this file.");
            if (rawPastedGrid.value.length < 2) return;

            isUploading.value = true;
            try {
                // Rebuild data using strictly mapped standard columns
                const activeHeaders = mappedHeaders.value.filter(h => h !== '-- Ignore --');
                const cleanRows = [];

                for (let r = 1; r < rawPastedGrid.value.length; r++) {
                    const rawRow = rawPastedGrid.value[r];
                    if(!rawRow || rawRow.length === 0 || !rawRow[0]) continue;
                    
                    const rowObj = {};
                    let hasData = false;
                    
                    for (let c = 0; c < mappedHeaders.value.length; c++) {
                        const targetHeader = mappedHeaders.value[c];
                        if (targetHeader !== '-- Ignore --') {
                            const val = rawRow[c] || '';
                            rowObj[targetHeader] = val;
                            if(val.trim() !== '') hasData = true;
                        }
                    }
                    if(hasData) cleanRows.push(rowObj);
                }

                const monthKey = uploadMonth.value.replace('-', '_');

                // Save to local memory store for testing
                localHistoricalDatabase.value[monthKey] = cleanRows;
                localStorage.setItem('localHistoricalDatabase', JSON.stringify(localHistoricalDatabase.value));

                // Optional: Attempt Firebase Cloud Storage upload if enabled later
                try {
                    const cleanCsvString = Papa.unparse({
                        fields: activeHeaders,
                        data: cleanRows.map(r => activeHeaders.map(h => r[h] || ''))
                    });
                    const fileName = `master_csvs/${monthKey}_master.csv`;
                    const fileRef = fbRef(storage, fileName);
                    await uploadString(fileRef, cleanCsvString, 'raw', { contentType: 'text/csv' });
                    console.log(`Saved to cloud as ${fileName}`);
                } catch (cloudErr) {
                    console.log("Cloud storage upload skipped (Running in local test mode).");
                }

                alert(`Success! Processed ${cleanRows.length} standardized rows for ${uploadMonth.value}. You can now query this data in the Search Archive tab!`);
                rawPastedGrid.value = [];
                activeTab.value = 'Search';
                searchMonth.value = uploadMonth.value;
                runSearch();

            } catch (error) {
                console.error("Processing Error:", error);
                alert("Failed to process CSV data.");
            }
            isUploading.value = false;
        };

        // --- SEARCH ENGINE LOGIC ---
        const searchMonth = ref(new Date().toISOString().slice(0, 7));
        const searchGL = ref('');
        const searchQuery = ref('');
        const isSearching = ref(false);
        const searchResults = ref([]);
        
        const searchTotal = computed(() => {
            return searchResults.value.reduce((sum, row) => sum + (parseFloat(String(row['Amount']).replace(/[^0-9.-]+/g,"")) || 0), 0);
        });

        const runSearch = async () => {
            if (!searchMonth.value) return alert("Please select a month to search.");
            
            isSearching.value = true;
            searchResults.value = [];
            
            const monthKey = searchMonth.value.replace('-', '_');
            let dataToSearch = localHistoricalDatabase.value[monthKey] || [];

            // If local memory is empty, attempt fetching from Firebase Storage (for future live use)
            if (dataToSearch.length === 0) {
                try {
                    const targetFileName = `master_csvs/${monthKey}_master.csv`;
                    const fileRef = fbRef(storage, targetFileName);
                    const downloadUrl = await getDownloadURL(fileRef);
                    const response = await fetch(downloadUrl);
                    const csvText = await response.text();
                    const parseResult = Papa.parse(csvText, { header: true, skipEmptyLines: true });
                    dataToSearch = parseResult.data;
                } catch (e) {
                    // Quietly catch if missing in cloud during test mode
                }
            }

            if (dataToSearch.length === 0) {
                alert(`No mapped data found for ${searchMonth.value}. Please upload a CSV for this month in the Upload & Map tab first.`);
                isSearching.value = false;
                return;
            }

            // In-Memory Fast Filtering
            const glFilter = searchGL.value.trim().toLowerCase();
            const textFilter = searchQuery.value.trim().toLowerCase();

            searchResults.value = dataToSearch.filter(row => {
                let matchesGL = true;
                let matchesText = true;

                if (glFilter) {
                    matchesGL = (row['GL Code'] || '').toLowerCase().includes(glFilter);
                }
                if (textFilter) {
                    const desc = (row['Description'] || '').toLowerCase();
                    const refId = (row['Reference ID'] || '').toLowerCase();
                    const loc = (row['Location'] || '').toLowerCase();
                    matchesText = desc.includes(textFilter) || refId.includes(textFilter) || loc.includes(textFilter);
                }

                return matchesGL && matchesText;
            });

            isSearching.value = false;
        };

        return {
            isUnlocked, loggedInUser, emailInput, passwordInput, authError, handleLogin, forceLock, activeTab,
            standardHeaders, rawPastedGrid, mappedHeaders, uploadMonth, isUploading, handleRawUpload, processAndUploadToCloud,
            searchMonth, searchGL, searchQuery, isSearching, searchResults, searchTotal, runSearch, formatCurrency
        };
    }
}).mount('#app');
