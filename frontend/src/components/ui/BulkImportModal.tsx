import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Upload, FileSpreadsheet, AlertCircle, Check, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (importedData: any[]) => void;
  sampleHeaders: string[];
  sampleRows?: string[][];
  title: string;
  description?: string;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  sampleHeaders,
  sampleRows = [],
  title,
  description
}) => {
  const { addToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const parseCSV = (text: string) => {
    try {
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      // Parse headers
      const csvHeaders = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
      
      // Verify we have required matches (optional but good for safety)
      const expectedHeadersLower = sampleHeaders.map(h => h.toLowerCase());
      const missingHeaders = expectedHeadersLower.filter(h => !csvHeaders.includes(h));
      
      if (missingHeaders.length > 0 && missingHeaders.length === expectedHeadersLower.length) {
        throw new Error(`Invalid headers. Expected columns like: ${sampleHeaders.join(', ')}`);
      }

      const items: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        // Handle basic comma splitting (ignoring commas inside quotes for simplicity, or simple quote stripping)
        let rowValues: string[] = [];
        let insideQuote = false;
        let currentValue = '';
        
        for (let c = 0; c < lines[i].length; c++) {
          const char = lines[i][c];
          if (char === '"') {
            insideQuote = !insideQuote;
          } else if (char === ',' && !insideQuote) {
            rowValues.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        rowValues.push(currentValue.trim());

        // Map row to headers
        const item: any = {};
        sampleHeaders.forEach((header) => {
          const idx = csvHeaders.indexOf(header.toLowerCase());
          if (idx !== -1) {
            let val = rowValues[idx] || '';
            // Strip leading/trailing quotes
            val = val.replace(/^["']|["']$/g, '').trim();
            item[header] = val;
          } else {
            item[header] = '';
          }
        });
        items.push(item);
      }

      if (items.length === 0) {
        throw new Error('No data rows found in CSV');
      }

      setParsedData(items);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse CSV file');
      setParsedData([]);
      setSelectedFile(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            parseCSV(event.target.result as string);
          }
        };
        reader.readAsText(file);
      } else {
        addToast('Please select a valid CSV spreadsheet file.', 'error');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          parseCSV(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImport = () => {
    if (parsedData.length > 0) {
      onImport(parsedData);
      addToast(`Successfully imported ${parsedData.length} records!`, 'success');
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setParsedData([]);
    setErrorMsg(null);
    onClose();
  };

  const handleLoadSample = () => {
    // Generate sample data rows based on columns
    const sampleItems = (sampleRows.length > 0 ? sampleRows : [
      sampleHeaders.map((_, idx) => `Sample Value ${idx + 1}`),
      sampleHeaders.map((_, idx) => `Sample Value ${idx + 1} (Alt)`)
    ]).map(row => {
      const item: any = {};
      sampleHeaders.forEach((h, idx) => {
        item[h] = row[idx] || '';
      });
      return item;
    });

    setParsedData(sampleItems);
    setSelectedFile(new File([''], 'sample_template_data.csv'));
    setErrorMsg(null);
    addToast('Sample template data loaded into editor!', 'info');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="lg"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleImport}
            disabled={parsedData.length === 0}
            className="flex items-center gap-1.5"
          >
            <Check size={15} /> Import {parsedData.length > 0 ? `(${parsedData.length} rows)` : ''}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 text-sm">
        {description && (
          <p className="text-slate-500 text-xs font-semibold leading-relaxed">
            {description}
          </p>
        )}

        {/* Drag target box */}
        {!selectedFile && (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragActive 
                ? 'border-blue-500 bg-blue-50/50' 
                : 'border-slate-350 hover:border-blue-400 hover:bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload size={32} className="mx-auto text-slate-400 mb-3" />
            <div className="font-bold text-slate-700">Drag and drop your CSV file here</div>
            <div className="text-xs text-slate-400 mt-1">or click to browse from files</div>
            <div className="text-[10px] font-semibold text-slate-450 mt-4 bg-slate-100/80 px-2 py-1 rounded inline-block">
              Spreadsheet format (.csv) only
            </div>
          </div>
        )}

        {/* File loaded state */}
        {selectedFile && (
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-150 rounded-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0">
                <FileSpreadsheet size={20} />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 truncate text-xs">{selectedFile.name}</div>
                <div className="text-[11px] text-slate-450 mt-0.5 font-mono">
                  {parsedData.length} records parsed successfully
                </div>
              </div>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => {
                setSelectedFile(null);
                setParsedData([]);
              }}
              className="text-xs text-slate-500 border-slate-200"
            >
              Clear
            </Button>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-150 text-rose-800 rounded-xl text-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Error parsing file</div>
              <div className="mt-0.5 font-medium leading-relaxed">{errorMsg}</div>
            </div>
          </div>
        )}

        {/* Instructions & Template preview */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Expected CSV Template Columns
            </h5>
            {!selectedFile && (
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition"
              >
                Load Sample Template Data
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-250 font-bold text-slate-600 font-mono">
                  {sampleHeaders.map(h => (
                    <th key={h} className="px-3.5 py-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-500 font-mono text-[11px]">
                {sampleRows.length > 0 ? (
                  sampleRows.slice(0, 2).map((row, rIdx) => (
                    <tr key={rIdx}>
                      {sampleHeaders.map((_, cIdx) => (
                        <td key={cIdx} className="px-3.5 py-1.5 whitespace-nowrap">
                          {row[cIdx] || ''}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    {sampleHeaders.map(h => (
                      <td key={h} className="px-3.5 py-1.5 whitespace-nowrap text-slate-400 italic">
                        {`value_${h.toLowerCase()}`}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-start gap-2 text-[10px] text-slate-450 leading-relaxed">
            <Info size={13} className="shrink-0 mt-0.5" />
            <p>
              Download or construct your CSV spreadsheet matching the columns above. Make sure all columns exist, and row fields align accurately before importing.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
