export class IngestionController {
    static async handleFileUpload(event, AppState, params) {
        const { pdfjsLib, originalFileName, ClassificationEngine, ExtractionEngine, ConfidenceEngine, ProvenanceEngine, EvidenceStateEngine, ValidationEngine, RelationshipEngine, CorroborationEngine, MaterialityEngine, RiskEngine, AuthorityEngine, ChainOfCustody, LoaderUI, Logger, renderResults, parseLedgerText } = params;
        const file = event.target.files[0];
        if (!file) return;

        AppState.originalFileName = file.name;
        document.getElementById('upload-section')?.classList.add('hidden');
        document.getElementById('progress-section')?.classList.remove('hidden');

        Logger.logSys(`Ingesting file: ${file.name}`, 'info', AppState);
        LoaderUI.updateProgress(10, 'LOADING PDF ENGINE...');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let fullText = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                LoaderUI.updateProgress(10 + ((i / pdf.numPages) * 70), `SPATIAL OCR - PAGE ${i}/${pdf.numPages}`);
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();

                let rows = [];
                textContent.items.forEach(item => {
                    let str = item.str.trim();
                    if (str.length === 0) return;
                    let y = item.transform[5], x = item.transform[4];
                    let foundRow = rows.find(r => Math.abs(r.y - y) < 8);
                    if (foundRow) foundRow.items.push({ x: x, str: item.str });
                    else rows.push({ y: y, items: [{ x: x, str: item.str }] });
                });

                rows.sort((a, b) => b.y - a.y);
                rows.forEach(r => {
                    r.items.sort((a, b) => a.x - b.x);
                    fullText += r.items.map(it => it.str).join(' ') + '\n';
                });
            }

            const classification = ClassificationEngine.classifyDocument(fullText.substring(0, 1000), file.name);
            Logger.logSys(`Classification Engine identified document as [${classification.documentType}]`, 'info', AppState);

            LoaderUI.updateProgress(85, 'EXECUTING PARSER & VALIDATION...');
            const parsedRows = parseLedgerText(fullText, classification.documentType);

            if (parsedRows.length === 0) throw new Error("No transactions detected.");

            const userSelectedEntity = window.prompt("Enter Entity Code (e.g., POMCO, RREDCO):", "POMCO") || "UNKNOWN";

            const normalizedRows = parsedRows.map(row => {
                const norm = ExtractionEngine.extractFields(row, classification.documentType, userSelectedEntity.toUpperCase());
                norm.type = classification.documentType;
                return norm;
            });

            const validation = ValidationEngine.validatePayload(normalizedRows, classification.documentType);

            AppState.extractedData = normalizedRows.map((row, idx) => {
                const scores = ConfidenceEngine.calculateScores({
                    sourceType: "SOURCE_PDF",
                    rawText: fullText.substring(0, 500), 
                    parsedRecord: row
                });

                const stampedRecord = ProvenanceEngine.stampRecord({
                  sourceFile: AppState.originalFileName,
                  sourceSystem: "Local_Upload",
                  sourceType: "SOURCE_PDF", 
                  entityContext: userSelectedEntity.toUpperCase(),
                  processedBy: "Lighthouse Engine v2 (Phase 5 Graph Enriched)",
                  ocrConfidence: scores.ocrConfidence,
                  parsingConfidence: scores.parsingConfidence,
                  extractedData: row
                });
                
                return {
                    _id: `PDF_REC_${idx}_${Date.now()}`,
                    _provenance: stampedRecord._provenance,
                    data: stampedRecord.data,
                    _validation: validation,
                    _evidenceState: EvidenceStateEngine.initializeState({
                        hasVariance: validation.tieOutStatus === 'FAIL'
                    })
                };
            });

            AppState.extractedData = await RelationshipEngine.buildRelationships(AppState.extractedData);
            AppState.extractedData = CorroborationEngine.evaluateDataset(AppState.extractedData).records;
            AppState.extractedData = MaterialityEngine.evaluateDataset(AppState.extractedData).records;
            AppState.extractedData = RiskEngine.evaluateDataset(AppState.extractedData).records;
            AppState.extractedData = AuthorityEngine.evaluateDataset(AppState.extractedData).records;

            await ChainOfCustody.recordEvent("INGEST_PDF_SCHEDULE_GRAPH", {
                filename: file.name,
                recordCount: AppState.extractedData.length,
                entity: userSelectedEntity.toUpperCase()
            }, AppState.currentUserEmail);

            LoaderUI.updateProgress(100, 'EXTRACTION & GRAPH MAPPING COMPLETE');
            renderResults(AppState.extractedData);

        } catch (err) {
            Logger.logSys(`Extraction Error: ${err.message}`, 'error', AppState);
            LoaderUI.updateProgress(0, 'PARSING FAILED');
        }
    }

    static handleTextProcess(AppState, params) {
        const { ClassificationEngine, ExtractionEngine, ConfidenceEngine, ProvenanceEngine, EvidenceStateEngine, ValidationEngine, RelationshipEngine, CorroborationEngine, MaterialityEngine, RiskEngine, AuthorityEngine, ChainOfCustody, LoaderUI, Logger, renderResults, parseLedgerText } = params;
        const text = document.getElementById('raw-text-input')?.value;
        if (!text || !text.trim()) return Logger.logSys('No text provided', 'warning', AppState);

        document.getElementById('upload-section')?.classList.add('hidden');
        document.getElementById('progress-section')?.classList.remove('hidden');

        LoaderUI.updateProgress(50, 'PARSING PASTE BUFFER...');
        setTimeout(async () => {
            const classification = ClassificationEngine.classifyDocument(text.substring(0, 1000), 'Pasted_Buffer.txt');
            Logger.logSys(`Classification Engine identified buffer as [${classification.documentType}]`, 'info', AppState);

            const parsedRows = parseLedgerText(text, classification.documentType);
            
            if(parsedRows.length > 0) {
                const userSelectedEntity = window.prompt("Enter Entity Code:", "POMCO") || "UNKNOWN";
                const normalizedRows = parsedRows.map(row => {
                    const norm = ExtractionEngine.extractFields(row, classification.documentType, userSelectedEntity.toUpperCase());
                    norm.type = classification.documentType;
                    return norm;
                });

                const validation = ValidationEngine.validatePayload(normalizedRows, classification.documentType);

                AppState.extractedData = normalizedRows.map((row, idx) => {
                    const scores = ConfidenceEngine.calculateScores({
                        sourceType: "OCR_EXTRACTION",
                        rawText: text.substring(0, 500),
                        parsedRecord: row
                    });

                    const stampedRecord = ProvenanceEngine.stampRecord({
                      sourceFile: "Pasted_Buffer.txt",
                      sourceSystem: "Manual_Text_Entry",
                      sourceType: "OCR_EXTRACTION", 
                      entityContext: userSelectedEntity.toUpperCase(),
                      processedBy: "Lighthouse Engine v2 (Phase 5 Graph Enriched)",
                      ocrConfidence: scores.ocrConfidence,
                      parsingConfidence: scores.parsingConfidence,
                      extractedData: row
                    });
                    
                    return {
                        _id: `TXT_REC_${idx}_${Date.now()}`,
                        _provenance: stampedRecord._provenance,
                        data: stampedRecord.data,
                        _validation: validation,
                        _evidenceState: EvidenceStateEngine.initializeState({
                            hasVariance: validation.tieOutStatus === 'FAIL'
                        })
                    };
                });

                AppState.extractedData = await RelationshipEngine.buildRelationships(AppState.extractedData);
                AppState.extractedData = CorroborationEngine.evaluateDataset(AppState.extractedData).records;
                AppState.extractedData = MaterialityEngine.evaluateDataset(AppState.extractedData).records;
                AppState.extractedData = RiskEngine.evaluateDataset(AppState.extractedData).records;
                AppState.extractedData = AuthorityEngine.evaluateDataset(AppState.extractedData).records;

                await ChainOfCustody.recordEvent("INGEST_TEXT_BUFFER_GRAPH", {
                    recordCount: AppState.extractedData.length,
                    entity: userSelectedEntity.toUpperCase()
                }, AppState.currentUserEmail);
            } else {
                AppState.extractedData = [];
            }

            LoaderUI.updateProgress(100, 'COMPLETE');
            renderResults(AppState.extractedData);
        }, 300);
    }
    static async fetchCloudCatalog(AppState, storage, ref, listAll, Logger) {
        if (AppState.cloudCatalog.length > 0) return;

        const initialView = document.getElementById('catalog-initial');
        if (initialView) {
            initialView.classList.add('hidden');
            initialView.classList.remove('flex');
        }

        const loadingView = document.getElementById('catalog-loading');
        if (loadingView) {
            loadingView.classList.remove('hidden');
            loadingView.classList.add('flex');
        }
        
        const catalogView = document.getElementById('catalog-view');
        if (catalogView) catalogView.classList.add('hidden');

        try {
            const folderRef = ref(storage, 'RREDCO Power GP');
            const result = await listAll(folderRef);
            AppState.cloudCatalog = result.items.filter(item => item.name.endsWith('.xlsx'));
            this.renderCatalog(AppState);
        } catch (err) {
            Logger.logSys(`Catalog Error: ${err.message}`, 'error', AppState);
            if (initialView) {
                initialView.classList.remove('hidden');
                initialView.classList.add('flex');
            }
            if (loadingView) {
                loadingView.classList.add('hidden');
                loadingView.classList.remove('flex');
            }
        }
    }

    static renderCatalog(AppState) {
        const grid = document.getElementById('entity-grid');
        const loadingView = document.getElementById('catalog-loading');
        const catalogView = document.getElementById('catalog-view');
        
        if (loadingView) loadingView.classList.add('hidden');
        if (catalogView) catalogView.classList.remove('hidden');
        if (!grid) return;

        grid.innerHTML = AppState.cloudCatalog.map((file, idx) => {
            const entityMatch = window.COMPANY_ENTITIES.find(e => file.name.includes(e.short)) || { name: file.name.split(' ')[0], short: "UNK" };
            return `
                <label class="group flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl hover:border-cyan-500/40 hover:bg-slate-800/40 cursor-pointer transition-all">
                    <input type="checkbox" name="entity-select" value="${idx}" class="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500/50 focus:ring-offset-slate-950">
                    <div class="flex-1 overflow-hidden">
                        <div class="flex items-center gap-1.5">
                            <span class="text-[10px] font-bold text-cyan-400 px-1 rounded bg-cyan-500/10">${entityMatch.short}</span>
                            <span class="text-xs font-bold text-white truncate">${entityMatch.name}</span>
                        </div>
                        <div class="text-[10px] text-slate-500 truncate mt-0.5">${file.name}</div>
                    </div>
                </label>
            `;
        }).join('');
    }

    static async pullSelectedLedgers(AppState, LoaderUI, executeCloudIngestion) {
        const selectedIndices = Array.from(document.querySelectorAll('input[name="entity-select"]:checked')).map(c => parseInt(c.value));
        if (selectedIndices.length === 0) return alert("Select at least one corporate entity ledger to begin.");

        if (!Array.isArray(AppState.cloudCatalog)) {
            return alert("Critical Error: Cloud Catalog state is missing. Please refresh and reconnect.");
        }

        const filesToProcess = selectedIndices.map(idx => AppState.cloudCatalog[idx]);
        LoaderUI.updateForensicLoader('Connecting', 5, 'Connecting to corporate storage...');
        await new Promise(resolve => setTimeout(resolve, 50));
        await executeCloudIngestion(filesToProcess);
    }

    static async executeCloudIngestion(xlsxFiles, AppState, params) {
        const { getDownloadURL, XLSX, ClassificationEngine, ExtractionEngine, ConfidenceEngine, ProvenanceEngine, EvidenceStateEngine, ValidationEngine, RelationshipEngine, CorroborationEngine, MaterialityEngine, RiskEngine, AuthorityEngine, ContradictionEngine, ChainOfCustody, LoaderUI, Logger, renderContradictionPanel, renderResults } = params;
        
        console.group('Lighthouse Diagnostics: Selective Ingestion');
        AppState.extractedData = [];
        Logger.logSys(`Initiating selective ingestion for ${xlsxFiles.length} entities...`, 'info', AppState);

        try {
            let rowId = 1;
            const totalFiles = xlsxFiles.length;
            let totalParseTime = 0;

            for (let idx = 0; idx < totalFiles; idx++) {
                const fileRef = xlsxFiles[idx];
                const fileProgressBase = 5 + (idx / totalFiles) * 70;
                LoaderUI.updateForensicLoader('Ledger Downloaded', fileProgressBase, `Downloading ${fileRef.name}...`, { records: AppState.extractedData.length });

                const classification = ClassificationEngine.classifyDocument('', fileRef.name);
                const docType = classification.documentType === 'Unknown Document' ? 'General Ledger Export' : classification.documentType;

                const url = await getDownloadURL(fileRef);
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();

                LoaderUI.updateForensicLoader('Records Parsed', fileProgressBase + (0.5 / totalFiles * 70), `Parsing ${fileRef.name}...`, { records: AppState.extractedData.length });
                await new Promise(resolve => setTimeout(resolve, 10));

                const t_parse_start = performance.now();
                                // Read the workbook in chunks if needed, but arrayBuffer reading is blocking
                // We'll yield to the event loop before and after reading
                await new Promise(resolve => setTimeout(resolve, 0));
                const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, cellNF: false, cellText: false });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                
                await new Promise(resolve => setTimeout(resolve, 0));
                const raw2D = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
                const t_parse_end = performance.now();
                totalParseTime += (t_parse_end - t_parse_start);

                const entityMatch = window.COMPANY_ENTITIES.find(e => fileRef.name.includes(e.short)) || { name: fileRef.name.split(' ')[0], short: "UNKNOWN" };
                const batchRecords = [];

                const MAX_RECORDS_PER_FILE = totalFiles < 3 ? 15000 : 5000;
                const recordsToProcess = Math.min(MAX_RECORDS_PER_FILE, raw2D.length);

                // Process records in chunks to prevent blocking the main thread
                const CHUNK_SIZE = 1000;
                for (let r = 1; r < recordsToProcess; r += CHUNK_SIZE) {
                    const chunkEnd = Math.min(r + CHUNK_SIZE, recordsToProcess);
                    
                    for (let i = r; i < chunkEnd; i++) {
                        const row = raw2D[i];
                        if (!row || row.length === 0) continue;

                        const rawRecord = {
                            'Department': row[0],
                            'Journal Entry': row[1],
                            'Originating Master Name': row[2],
                            'TRX Date': row[3],
                            'Account Number': row[4],
                            'Account Description': row[5],
                            'Debit Amount': row[6],
                            'Credit Amount': row[7],
                            'Reference': row[8],
                            'Description': row[9],
                            'Originating TRX Source': row[10],
                            'User Who Posted': row[11],
                            row_id: `LH_ROW_${rowId++}`,
                            _cross_foot_valid: true
                        };

                        const normalizedRecord = ExtractionEngine.extractFields(rawRecord, docType, entityMatch.short || "UNKNOWN");
                        normalizedRecord.row_id = rawRecord.row_id;
                        normalizedRecord.type = docType;

                        const scores = ConfidenceEngine.calculateScores({
                            sourceType: "NATIVE_EXPORT",
                            parsedRecord: normalizedRecord
                        });

                        const stampedRecord = ProvenanceEngine.stampRecord({
                            sourceFile: fileRef.name,
                            sourceSystem: "Firebase_Storage",
                            sourceType: "NATIVE_EXPORT", 
                            entityContext: entityMatch.short || "UNKNOWN", 
                            processedBy: "Lighthouse Engine v3 (Selective Load)",
                            ocrConfidence: scores.ocrConfidence,
                            parsingConfidence: scores.parsingConfidence,
                            extractedData: normalizedRecord
                        });

                        batchRecords.push({
                            _id: stampedRecord.data?.row_id || `REC_${Date.now()}_${Math.random()}`,
                            _provenance: stampedRecord._provenance,
                            data: stampedRecord.data,
                            _evidenceState: EvidenceStateEngine.initializeState({ hasVariance: false })
                        });
                    }
                    
                    // Yield to the event loop after processing a chunk
                    LoaderUI.updateForensicLoader('Records Parsed', fileProgressBase + (0.5 / totalFiles * 70) + ((r / recordsToProcess) * (30 / totalFiles)), `Parsing ${fileRef.name}... (${Math.round((r/recordsToProcess)*100)}%)`, { records: AppState.extractedData.length + batchRecords.length });
                    await new Promise(resolve => setTimeout(resolve, 0));
                }

                const validation = ValidationEngine.validatePayload(batchRecords.map(b => b.data), docType);
                batchRecords.forEach(b => {
                    b._validation = validation;
                    if (validation.tieOutStatus === 'FAIL') b._evidenceState.hasVariance = true;
                });

                AppState.extractedData = [...AppState.extractedData, ...batchRecords];
                await new Promise(resolve => setTimeout(resolve, 20));
            }

            console.log(`XLSX Parse Phase Complete: ${totalParseTime.toFixed(2)}ms`);

            LoaderUI.updateForensicLoader('Relationships Built', 80, 'Executing Forensic Relationship Pipeline...', { records: AppState.extractedData.length, events: ChainOfCustody.getLedger().length });
            await new Promise(resolve => setTimeout(resolve, 50));
            AppState.extractedData = await RelationshipEngine.buildRelationships(AppState.extractedData);

            LoaderUI.updateForensicLoader('Analysis Ongoing', 85, 'Running Corroboration & Risk Engines...', { records: AppState.extractedData.length, events: ChainOfCustody.getLedger().length });
            await new Promise(resolve => setTimeout(resolve, 10));
            AppState.extractedData = CorroborationEngine.evaluateDataset(AppState.extractedData).records;

            LoaderUI.updateForensicLoader('Analysis Ongoing', 90, 'Running Materiality & Authority Engines...', { records: AppState.extractedData.length, events: ChainOfCustody.getLedger().length });
            await new Promise(resolve => setTimeout(resolve, 10));
            AppState.extractedData = MaterialityEngine.evaluateDataset(AppState.extractedData).records;
            AppState.extractedData = RiskEngine.evaluateDataset(AppState.extractedData).records;
            AppState.extractedData = AuthorityEngine.evaluateDataset(AppState.extractedData).records;

            const contradictionFlags = ContradictionEngine.analyzeDataset(AppState.extractedData);
            renderContradictionPanel(contradictionFlags);

            await ChainOfCustody.recordEvent("INGEST_CLOUD_LEDGERS_SELECTIVE", {
                fileCount: totalFiles,
                recordCount: AppState.extractedData.length,
                entities: xlsxFiles.map(f => f.name)
            }, AppState.currentUserEmail);

            LoaderUI.updateForensicLoader('Analysis Complete', 100, 'Finalizing results...', { records: AppState.extractedData.length, events: ChainOfCustody.getLedger().length });
            await new Promise(resolve => setTimeout(resolve, 100));

            renderResults(AppState.extractedData);
            LoaderUI.hideForensicLoader();
            console.groupEnd();
        } catch (err) {
            Logger.logSys(`Ingestion Failure: ${err.message}`, 'error', AppState);
            LoaderUI.hideForensicLoader();
            console.groupEnd();
        }
    }
}
