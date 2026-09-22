// app.js - Enterprise Power GP & Promo Tracker Application Controller
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { 
  getStorage, 
  ref as fbRef, 
  uploadString, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

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

// 17 Corporate entities for RREDCO group
const CORPORATE_ENTITIES = [
  { code: 'E01', name: 'POMCO E01', short: 'POMCO' },
  { code: 'E02', name: 'RRCLLC E02', short: 'RRCLLC' },
  { code: 'E03', name: 'RRCSCO E03', short: 'RRCSCO' },
  { code: 'E04', name: 'RRDLLC E04', short: 'RRDLLC' },
  { code: 'E05', name: 'RREDCO E05', short: 'RREDCO' },
  { code: 'E06', name: 'RRELLC E06', short: 'RRELLC' },
  { code: 'E07', name: 'RREVMCO E07', short: 'RREVMCO' },
  { code: 'E08', name: 'RRH2ECO E08', short: 'RRH2ECO' },
  { code: 'E09', name: 'RRICO E09', short: 'RRICO' },
  { code: 'E10', name: 'RRKOLLC E10', short: 'RRKOLLC' },
  { code: 'E11', name: 'RRSDLLC E11', short: 'RRSDLLC' },
  { code: 'E12', name: 'RRSDRBLLC E12', short: 'RRSDRBLLC' },
  { code: 'E13', name: 'RRUCO E13', short: 'RRUCO' },
  { code: 'E14', name: 'WRGCC E14', short: 'WRGCC' },
  { code: 'E15', name: 'WRHCO E15', short: 'WRHCO' },
  { code: 'E16', name: 'WRMM E16', short: 'WRMM' },
  { code: 'E17', name: 'RR-KR3 JV E17', short: 'RR-KR3 JV' }
];

// Expanded header choices supporting both simplified tracker & raw Dynamics GP GL views
const STANDARD_HEADERS = [
  '-- Ignore --',
  'Transaction Date',
  'Invoice Number',
  'Journal Entry',
  'GL Code',
  'Account Description',
  'Description',
  'Amount',
  'Debit Amount',
  'Credit Amount',
  'Location',
  'Reference ID',
  'Department',
  'Originating Master Name',
  'User Who Posted'
];

const { createApp, ref, computed, nextTick, onMounted } = window.Vue;

createApp({
  setup() {
    // Authentication & Access Control States
    const isUnlocked = ref(true); // Default to unlocked for local/browser testing
    const loggedInUser = ref('Local Testing Mode');
    const emailInput = ref('');
    const passwordInput = ref('');
    const authError = ref('');
    const activeTab = ref('Import'); // 'Import' | 'Search' | 'Entities'

    // System manager directory matching team email logins
    const systemUsers = {
      'lenay@rredco.com': { name: 'Lenay A.' },
      'tricia@rredco.com': { name: 'Tricia K.' },
      'whitney@rredco.com': { name: 'Whitney M.' },
      'nicholas.grace@rredco.com': { name: 'Nicholas G.' }
    };

    // Non-blocking in-app notification state (replaces browser alerts)
    const toast = ref({
      show: false,
      message: '',
      type: 'info', // 'info' | 'success' | 'warning' | 'error'
      timeoutId: null
    });

    const showToast = (message, type = 'info', duration = 4000) => {
      if (toast.value.timeoutId) {
        clearTimeout(toast.value.timeoutId);
      }
      toast.value.message = message;
      toast.value.type = type;
      toast.value.show = true;

      toast.value.timeoutId = setTimeout(() => {
        toast.value.show = false;
      }, duration);
    };

    const dismissToast = () => {
      toast.value.show = false;
      if (toast.value.timeoutId) clearTimeout(toast.value.timeoutId);
    };

    const handleLogin = () => {
      authError.value = '';
      if (!emailInput.value || !passwordInput.value) {
        authError.value = 'Please provide both email and password.';
        return;
      }

      signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value)
        .then(() => {
          emailInput.value = '';
          passwordInput.value = '';
          showToast('Signed in successfully', 'success');
          refreshIcons();
        })
        .catch((err) => {
          authError.value = 'Invalid credentials. ' + (err.message || '');
          showToast('Authentication failed: ' + err.code, 'error');
        });
    };

    const forceLock = () => {
      signOut(auth).then(() => {
        isUnlocked.value = false;
        loggedInUser.value = '';
        showToast('You have been signed out.', 'info');
        refreshIcons();
      });
    };

    onMounted(() => {
      refreshIcons();

      onAuthStateChanged(auth, (user) => {
        if (user) {
          const userEmail = (user.email || '').toLowerCase();
          const managerData = systemUsers[userEmail] || { name: user.email.split('@')[0] };
          loggedInUser.value = managerData.name;
          isUnlocked.value = true;
          showToast(`Welcome back, ${managerData.name}`, 'info', 2500);
        }
      });
    });

    const refreshIcons = () => {
      nextTick(() => {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          window.lucide.createIcons();
        }
      });
    };

    const formatCurrency = (val) => {
      if (val === null || val === undefined || val === '') return '$0.00';
      const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
      if (isNaN(num)) return '$0.00';
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    };

    const rawPastedGrid = ref([]);
    const mappedHeaders = ref([]);
    const detectedFileName = ref('');
    const selectedUploadEntity = ref('AUTO');
    const uploadMonth = ref(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const isUploading = ref(false);

    // Resilient memory store with safe fallback to memory if storage access is restricted
    const getStoredData = () => {
      try {
        const stored = localStorage.getItem('localHistoricalDatabase');
        return stored ? JSON.parse(stored) : {};
      } catch (err) {
        console.warn('Storage unavailable, operating purely in-memory:', err);
        return {};
      }
    };

    const localHistoricalDatabase = ref(getStoredData());

    const persistLocalDatabase = () => {
      try {
        localStorage.setItem('localHistoricalDatabase', JSON.stringify(localHistoricalDatabase.value));
      } catch (err) {
        console.warn('Could not persist to local storage:', err);
      }
    };

    // Auto-detect entity code/name from uploaded CSV filename
    const detectEntityFromFileName = (filename) => {
      if (!filename) return null;
      const upper = filename.toUpperCase();

      for (const ent of CORPORATE_ENTITIES) {
        const codePattern = new RegExp(`(^|[^A-Z0-9])${ent.code}([^A-Z0-9]|$)`, 'i');
        if (codePattern.test(upper)) return ent.name;

        const cleanShort = ent.short.replace(/[^A-Z0-9]/gi, '');
        const cleanUpper = upper.replace(/[^A-Z0-9]/gi, '');
        if (cleanUpper.includes(cleanShort)) return ent.name;
      }
      return null;
    };

    const smartMapHeader = (headerName) => {
      const h = (headerName || '').toLowerCase().trim();
      if (!h) return '-- Ignore --';

      // Specific Dynamics GP & Financial Patterns
      if (h.includes('invoice') || h.includes('invoicenbr') || h.includes('inv_no') || h.includes('sopnumbe') || h.includes('vchrnmbr')) {
        return 'Invoice Number';
      }
      if (h.includes('journal') || h.includes('jrnentry') || h.includes('je') || h.includes('docnumbr_gl')) {
        return 'Journal Entry';
      }
      if (h.includes('trx date') || h.includes('trx_date') || h.includes('transaction date') || h.includes('docdate') || h.includes('date')) {
        return 'Transaction Date';
      }
      if (h.includes('debit') || h.includes('debitamt') || h.includes('dr_amount')) {
        return 'Debit Amount';
      }
      if (h.includes('credit') || h.includes('crdtamnt') || h.includes('cr_amount')) {
        return 'Credit Amount';
      }
      if (h.includes('account number') || h.includes('actnumst') || h.includes('gl') || h.includes('account') || h.includes('actindx')) {
        return 'GL Code';
      }
      if (h.includes('account desc') || h.includes('actdescr')) {
        return 'Account Description';
      }
      if (h.includes('dept') || h.includes('department') || h.includes('cost_center')) {
        return 'Department';
      }
      if (h.includes('master name') || h.includes('ormstrnm') || h.includes('vendor') || h.includes('customer')) {
        return 'Originating Master Name';
      }
      if (h.includes('user') || h.includes('uswhpstd') || h.includes('posted_by')) {
        return 'User Who Posted';
      }
      if (h.includes('loc') || h.includes('entity') || h.includes('company') || h.includes('store') || h.includes('plant')) {
        return 'Location';
      }
      if (h.includes('ref') || h.includes('batch') || h.includes('trx') || h.includes('source')) {
        return 'Reference ID';
      }
      if (h.includes('desc') || h.includes('dscriptn') || h.includes('line_desc')) {
        return 'Description';
      }
      if (h.includes('amt') || h.includes('amount') || h.includes('net')) {
        return 'Amount';
      }

      return '-- Ignore --';
    };

    const handleRawUpload = (event) => {
      const file = event.target.files ? event.target.files[0] : null;
      if (!file) return;

      detectedFileName.value = file.name;
      const detected = detectEntityFromFileName(file.name);
      if (detected) {
        selectedUploadEntity.value = detected;
        showToast(`Detected entity: ${detected} from ${file.name}`, 'info');
      }

      Papa.parse(file, {
        skipEmptyLines: 'greedy',
        complete: (results) => {
          if (!results.data || results.data.length < 2) {
            showToast('The uploaded CSV file appears empty or lacks data rows.', 'warning');
            return;
          }

          rawPastedGrid.value = results.data;
          const firstRow = results.data[0];
          mappedHeaders.value = firstRow.map(h => smartMapHeader(h));

          showToast(`Successfully analyzed ${results.data.length - 1} rows. Please verify column mappings.`, 'success');
          refreshIcons();
        },
        error: (err) => {
          showToast('Failed to parse CSV file: ' + err.message, 'error');
        }
      });
    };

    const processAndUploadToCloud = async () => {
      if (!uploadMonth.value) {
        showToast('Please select the target Year/Month for this file before uploading.', 'warning');
        return;
      }
      if (rawPastedGrid.value.length < 2) {
        showToast('No parsed rows to upload. Please load a CSV file first.', 'warning');
        return;
      }

      isUploading.value = true;
      try {
        const activeMappings = [];
        mappedHeaders.value.forEach((targetH, colIdx) => {
          if (targetH !== '-- Ignore --') {
            activeMappings.push({ target: targetH, colIdx });
          }
        });

        if (activeMappings.length === 0) {
          showToast('All columns are set to "-- Ignore --". Please map at least one column.', 'warning');
          isUploading.value = false;
          return;
        }

        const resolvedEntity = selectedUploadEntity.value === 'AUTO' 
          ? (detectEntityFromFileName(detectedFileName.value) || 'General') 
          : selectedUploadEntity.value;

        const cleanRows = [];
        for (let r = 1; r < rawPastedGrid.value.length; r++) {
          const rawRow = rawPastedGrid.value[r];
          if (!rawRow || rawRow.length === 0) continue;

          const rowObj = {
            _id: `${resolvedEntity}_${uploadMonth.value}_${r}_${Math.random().toString(36).slice(2, 6)}`,
            Location: resolvedEntity
          };

          let hasData = false;
          activeMappings.forEach(({ target, colIdx }) => {
            const val = rawRow[colIdx] !== undefined && rawRow[colIdx] !== null ? String(rawRow[colIdx]).trim() : '';
            rowObj[target] = val;
            if (val !== '') hasData = true;
          });

          // Calculate synthesized net Amount if Debit/Credit provided but Net is blank
          if (!rowObj['Amount']) {
            const dr = parseFloat(String(rowObj['Debit Amount'] || '0').replace(/[^0-9.-]+/g, '')) || 0;
            const cr = parseFloat(String(rowObj['Credit Amount'] || '0').replace(/[^0-9.-]+/g, '')) || 0;
            if (dr !== 0 || cr !== 0) {
              rowObj['Amount'] = (dr - cr).toFixed(2);
            }
          }

          if (hasData) {
            cleanRows.push(rowObj);
          }
        }

        const monthKey = uploadMonth.value.replace('-', '_');

        // Store into fast local historical repository
        if (!localHistoricalDatabase.value[monthKey]) {
          localHistoricalDatabase.value[monthKey] = [];
        }
        // Merge or replace rows for this location
        const existingWithoutThisLoc = localHistoricalDatabase.value[monthKey].filter(
          row => row.Location !== resolvedEntity
        );
        localHistoricalDatabase.value[monthKey] = [...existingWithoutThisLoc, ...cleanRows];
        persistLocalDatabase();

        // Attempt Cloud Storage persistence for seamless cross-device sharing
        try {
          const fieldsToExport = ['Location', ...activeMappings.map(m => m.target).filter(t => t !== 'Location')];
          const cleanCsvString = Papa.unparse({
            fields: fieldsToExport,
            data: localHistoricalDatabase.value[monthKey].map(row => fieldsToExport.map(f => row[f] || ''))
          });

          const fileName = `master_csvs/${monthKey}_master.csv`;
          const fileRef = fbRef(storage, fileName);
          await uploadString(fileRef, cleanCsvString, 'raw', { contentType: 'text/csv' });
          console.log(`Uploaded combined dataset to Cloud Storage: ${fileName}`);
        } catch (cloudErr) {
          console.warn('Cloud Storage sync skipped (running in offline/local test mode):', cloudErr);
        }

        showToast(`Successfully processed ${cleanRows.length} records for ${resolvedEntity} (${uploadMonth.value})!`, 'success');
        
        // Switch to Search tab with the newly loaded month pre-selected
        searchMonth.value = uploadMonth.value;
        activeTab.value = 'Search';
        rawPastedGrid.value = [];
        runSearch();

      } catch (error) {
        console.error('Processing error:', error);
        showToast('Failed to process CSV records: ' + error.message, 'error');
      } finally {
        isUploading.value = false;
        refreshIcons();
      }
    };

    const searchMonth = ref(new Date().toISOString().slice(0, 7));
    const searchGL = ref('');
    const searchLocation = ref('');
    const searchQuery = ref('');
    const searchTargetField = ref('All');
    const isSearching = ref(false);
    const searchResults = ref([]);
    const selectedRecordModal = ref(null);

    // Dynamic aggregated total computation
    const searchTotal = computed(() => {
      return searchResults.value.reduce((sum, row) => {
        const val = row['Amount'] || row['Debit Amount'] || 0;
        const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
    });

    const activeRecordCount = computed(() => searchResults.value.length);

    const runSearch = async () => {
      if (!searchMonth.value) {
        showToast('Please specify a Year/Month to query.', 'warning');
        return;
      }

      isSearching.value = true;
      searchResults.value = [];

      const monthKey = searchMonth.value.replace('-', '_');
      let dataToSearch = localHistoricalDatabase.value[monthKey] || [];

      // Attempt to load from Firebase Storage if not found in local memory
      if (dataToSearch.length === 0) {
        try {
          const targetFileName = `master_csvs/${monthKey}_master.csv`;
          const fileRef = fbRef(storage, targetFileName);
          const downloadUrl = await getDownloadURL(fileRef);
          const response = await fetch(downloadUrl);
          const csvText = await response.text();
          const parseResult = Papa.parse(csvText, { header: true, skipEmptyLines: true });
          dataToSearch = parseResult.data || [];
          localHistoricalDatabase.value[monthKey] = dataToSearch;
          persistLocalDatabase();
          showToast(`Retrieved ${dataToSearch.length} records from Cloud Storage for ${searchMonth.value}`, 'info');
        } catch (storageErr) {
          // File not in cloud storage yet, continue
        }
      }

      if (dataToSearch.length === 0) {
        showToast(`No historical data found for ${searchMonth.value}. Upload a CSV in the Import tab first.`, 'info');
        isSearching.value = false;
        refreshIcons();
        return;
      }

      // Filter evaluations
      const glFilter = searchGL.value.trim().toLowerCase();
      const locFilter = searchLocation.value.trim().toLowerCase();
      const queryFilter = searchQuery.value.trim().toLowerCase();
      const targetCol = searchTargetField.value;

      searchResults.value = dataToSearch.filter(row => {
        if (locFilter && !(row['Location'] || '').toLowerCase().includes(locFilter)) {
          return false;
        }

        if (glFilter && !(row['GL Code'] || '').toLowerCase().includes(glFilter)) {
          return false;
        }

        if (queryFilter) {
          if (targetCol !== 'All' && row[targetCol] !== undefined) {
            return String(row[targetCol]).toLowerCase().includes(queryFilter);
          } else {
            // Check across all standard fields
            const desc = (row['Description'] || '').toLowerCase();
            const inv = (row['Invoice Number'] || '').toLowerCase();
            const je = (row['Journal Entry'] || '').toLowerCase();
            const refId = (row['Reference ID'] || '').toLowerCase();
            const master = (row['Originating Master Name'] || '').toLowerCase();
            const dept = (row['Department'] || '').toLowerCase();
            const acctDesc = (row['Account Description'] || '').toLowerCase();

            return desc.includes(queryFilter) ||
                   inv.includes(queryFilter) ||
                   je.includes(queryFilter) ||
                   refId.includes(queryFilter) ||
                   master.includes(queryFilter) ||
                   dept.includes(queryFilter) ||
                   acctDesc.includes(queryFilter);
          }
        }

        return true;
      });

      isSearching.value = false;
      refreshIcons();
    };

    const exportSearchResults = () => {
      if (searchResults.value.length === 0) {
        showToast('No results available to export.', 'warning');
        return;
      }

      const csvString = Papa.unparse(searchResults.value);
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PowerGP_Results_${searchMonth.value}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Exported ${searchResults.value.length} rows to CSV.`, 'success');
    };

    const inspectRecord = (record) => {
      selectedRecordModal.value = record;
      refreshIcons();
    };

    const closeRecordModal = () => {
      selectedRecordModal.value = null;
    };

    return {
      // Auth & User
      isUnlocked,
      loggedInUser,
      emailInput,
      passwordInput,
      authError,
      handleLogin,
      forceLock,
      activeTab,

      // Toast Notification
      toast,
      showToast,
      dismissToast,

      // Constants
      corporateEntities: CORPORATE_ENTITIES,
      standardHeaders: STANDARD_HEADERS,

      // Import & Mapping
      rawPastedGrid,
      mappedHeaders,
      detectedFileName,
      selectedUploadEntity,
      uploadMonth,
      isUploading,
      handleRawUpload,
      processAndUploadToCloud,

      // Search & Aggregations
      searchMonth,
      searchGL,
      searchLocation,
      searchQuery,
      searchTargetField,
      isSearching,
      searchResults,
      searchTotal,
      activeRecordCount,
      runSearch,
      exportSearchResults,
      formatCurrency,

      // Inspector Modal
      selectedRecordModal,
      inspectRecord,
      closeRecordModal
    };
  }
}).mount('#app');
