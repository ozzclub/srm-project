'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, FileSpreadsheet, Download, AlertCircle, CheckCircle, Loader2, RefreshCw, SkipForward, GitCompare } from 'lucide-react';
import { materialApi } from '@/lib/api';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type FieldChoice = 'old' | 'new' | 'merge';

interface ImportPreview {
  newCount: number;
  replaceCount: number;
  skipCount: number;
  existingMaterials: Array<{
    material_code: string;
    row: number;
    existing: {
      id: number;
      description: string;
      unit: string;
      unit_price: number;
      whse?: string;
      remarks?: string;
      material_type_ids?: number[];
      material_type_names?: string[];
    };
    newData: {
      description: string;
      unit: string;
      unit_price: number;
      whse?: string;
      remarks?: string;
      material_type_names?: string[];
    };
  }>;
  totalParsed: number;
}

type ImportMode = 'insert' | 'replace' | 'skip' | 'smart';
type ModalStep = 'upload' | 'preview' | 'result';

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  inserted: number;
  replaced: number;
  skipped: number;
  details: Array<{
    row: number;
    success: boolean;
    material_code?: string;
    error?: string;
    action?: 'inserted' | 'replaced' | 'skipped';
  }>;
}

export default function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState<ModalStep>('upload');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selectedMode, setSelectedMode] = useState<ImportMode>('insert');
  const [fieldChoices, setFieldChoices] = useState<Record<string, Record<string, FieldChoice>>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setFile(null);
    setIsDragging(false);
    setIsUploading(false);
    setCurrentStep('upload');
    setPreview(null);
    setSelectedMode('insert');
    setFieldChoices({});
    setExpandedRows(new Set());
    setImportResult(null);
    setError(null);
    onClose();
  }, [onClose]);

  const handlePreview = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await materialApi.previewImport(formData);
      const previewData = response.data.data;
      setPreview(previewData);
      
      // Auto-select 'replace' mode if there are existing materials
      if (previewData.replaceCount > 0) {
        setSelectedMode('replace');
      } else {
        setSelectedMode('insert');
      }
      
      setCurrentStep('preview');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to preview file';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  }, []);

  const validateAndSetFile = (selectedFile: File) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Only Excel files (.xlsx, .xls) are allowed');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError(null);
    setFile(selectedFile);
    setImportResult(null);
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await materialApi.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'material-import-template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to download template');
      console.error('Template download error:', err);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', selectedMode);

      // Pass fieldChoices for smart mode
      if (selectedMode === 'smart' && Object.keys(fieldChoices).length > 0) {
        formData.append('fieldChoices', JSON.stringify(fieldChoices));
      }

      const response = await materialApi.import(formData, selectedMode);
      setImportResult(response.data.data);
      setCurrentStep('result');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Import failed';
      
      // If we have detailed result data, show it
      if (err.response?.data?.data) {
        setImportResult(err.response.data.data);
        setCurrentStep('result');
      } else {
        // Show clean error message
        setError(message.length > 300 ? message.substring(0, 300) + '...' : message);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Import Materials from Excel</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {currentStep === 'result' && importResult ? (
            // Import Results
            <div className="space-y-4">
              {/* Summary */}
              <div className={`p-4 rounded-lg ${
                importResult.failed === 0 ? 'bg-green-50' : 'bg-yellow-50'
              }`}>
                <div className="flex items-start gap-3">
                  {importResult.failed === 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">
                      {importResult.failed === 0
                        ? 'Import Successful'
                        : 'Import Completed with Errors'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Total: {importResult.total} |
                      Inserted: <span className="text-blue-600 font-medium">{importResult.inserted}</span> |
                      Replaced: <span className="text-yellow-600 font-medium">{importResult.replaced}</span> |
                      Skipped: <span className="text-gray-600 font-medium">{importResult.skipped}</span> |
                      Failed: <span className="text-red-600 font-medium">{importResult.failed}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Row</th>
                      <th className="px-4 py-2 text-left font-medium">Status</th>
                      <th className="px-4 py-2 text-left font-medium">Material Code</th>
                      <th className="px-4 py-2 text-left font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {importResult.details.map((detail) => (
                      <tr key={detail.row}>
                        <td className="px-4 py-2">{detail.row}</td>
                        <td className="px-4 py-2">
                          {detail.success ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" /> Success
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" /> Failed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">
                          {detail.material_code || '-'}
                        </td>
                        <td className="px-4 py-2 text-red-600 text-xs">
                          {detail.error || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Import Another File
                </button>
                <button
                  onClick={() => {
                    if (importResult.failed === 0) {
                      onSuccess();
                      handleClose();
                    }
                  }}
                  disabled={importResult.failed > 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Done
                </button>
              </div>
            </div>
          ) : currentStep === 'preview' && preview ? (
            // Preview Step
            <div className="space-y-4">
              {/* Preview Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-3">Import Preview</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{preview.newCount}</p>
                    <p className="text-gray-600">New Materials</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{preview.replaceCount}</p>
                    <p className="text-gray-600">Existing (will update)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-600">{preview.totalParsed}</p>
                    <p className="text-gray-600">Total Rows</p>
                  </div>
                </div>
              </div>

              {preview.replaceCount > 0 && (
                <>
                  {/* Mode Selection */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Choose Import Mode:</h4>
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="importMode"
                          checked={selectedMode === 'smart'}
                          onChange={() => setSelectedMode('smart')}
                          className="mt-1"
                        />
                        <div>
                          <div className="flex items-center gap-2 font-medium">
                            <GitCompare className="w-4 h-4 text-purple-600" />
                            Smart Select (per-field)
                          </div>
                          <p className="text-sm text-gray-600">
                            Compare old vs new values and choose which to keep for each field
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="importMode"
                          checked={selectedMode === 'replace'}
                          onChange={() => setSelectedMode('replace')}
                          className="mt-1"
                        />
                        <div>
                          <div className="flex items-center gap-2 font-medium">
                            <RefreshCw className="w-4 h-4 text-yellow-600" />
                            Replace All
                          </div>
                          <p className="text-sm text-gray-600">
                            Replace all existing material(s) with new data from Excel
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="importMode"
                          checked={selectedMode === 'skip'}
                          onChange={() => setSelectedMode('skip')}
                          className="mt-1"
                        />
                        <div>
                          <div className="flex items-center gap-2 font-medium">
                            <SkipForward className="w-4 h-4 text-gray-600" />
                            Skip Existing
                          </div>
                          <p className="text-sm text-gray-600">
                            Skip {preview.replaceCount} existing material(s), only import new ones
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Smart Mode: Per-Field Comparison */}
                  {selectedMode === 'smart' && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="p-3 bg-purple-50 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GitCompare className="w-4 h-4 text-purple-600" />
                          <h4 className="font-medium text-purple-900">Compare & Choose Values</h4>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const newChoices: Record<string, Record<string, FieldChoice>> = {};
                              preview.existingMaterials.forEach((mat) => {
                                newChoices[mat.material_code] = {
                                  description: 'new',
                                  material_type_ids: 'new',
                                  remarks: 'new',
                                  unit_price: 'new',
                                  whse: 'new',
                                };
                              });
                              setFieldChoices(newChoices);
                            }}
                            className="text-xs px-2 py-1 bg-purple-200 text-purple-800 rounded hover:bg-purple-300 font-medium"
                          >
                            Use All New
                          </button>
                          <button
                            onClick={() => {
                              const newChoices: Record<string, Record<string, FieldChoice>> = {};
                              preview.existingMaterials.forEach((mat) => {
                                newChoices[mat.material_code] = {
                                  description: 'old',
                                  material_type_ids: 'old',
                                  remarks: 'old',
                                  unit_price: 'old',
                                  whse: 'old',
                                };
                              });
                              setFieldChoices(newChoices);
                            }}
                            className="text-xs px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium"
                          >
                            Keep All Old
                          </button>
                          <button
                            onClick={() => {
                              const newChoices: Record<string, Record<string, FieldChoice>> = {};
                              preview.existingMaterials.forEach((mat) => {
                                newChoices[mat.material_code] = {
                                  description: 'new',
                                  material_type_ids: 'merge',
                                  remarks: 'new',
                                  unit_price: 'new',
                                  whse: 'new',
                                };
                              });
                              setFieldChoices(newChoices);
                            }}
                            className="text-xs px-2 py-1 bg-blue-200 text-blue-800 rounded hover:bg-blue-300 font-medium"
                          >
                            Merge Types
                          </button>
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {preview.existingMaterials.map((mat) => {
                          const isExpanded = expandedRows.has(mat.material_code);
                          const choices = fieldChoices[mat.material_code] || {};
                          const fields: Array<{ key: string; label: string; oldVal: string; newVal: string; showMerge?: boolean }> = [
                            { key: 'description', label: 'Description', oldVal: mat.existing.description, newVal: mat.newData.description },
                            { key: 'material_type_ids', label: 'Types', oldVal: (mat.existing.material_type_names || []).join(', ') || '-', newVal: (mat.newData.material_type_names || []).join(', ') || '-', showMerge: true },
                            { key: 'remarks', label: 'Remarks', oldVal: mat.existing.remarks || '-', newVal: mat.newData.remarks || '-' },
                            { key: 'unit_price', label: 'Unit Price', oldVal: String(mat.existing.unit_price ?? '-'), newVal: String(mat.newData.unit_price ?? '-') },
                            { key: 'whse', label: 'WHSE', oldVal: mat.existing.whse || '-', newVal: mat.newData.whse || '-' },
                          ];

                          return (
                            <div key={mat.material_code} className="border-b last:border-b-0">
                              <button
                                onClick={() => {
                                  const next = new Set(expandedRows);
                                  isExpanded ? next.delete(mat.material_code) : next.add(mat.material_code);
                                  setExpandedRows(next);
                                }}
                                className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-sm font-medium">{mat.material_code}</span>
                                  <span className="text-xs text-gray-500">Row {mat.row}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">
                                    {Object.values(choices).filter((c) => c === 'new').length || 0} new /{' '}
                                    {Object.values(choices).filter((c) => c === 'old').length || 0} old /{' '}
                                    {Object.values(choices).filter((c) => c === 'merge').length || 0} merge
                                  </span>
                                  <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </button>
                              {isExpanded && (
                                <div className="px-4 pb-4 space-y-3 bg-gray-50">
                                  {fields.map((field) => {
                                    const choice = choices[field.key] || 'new';
                                    const isDifferent = field.oldVal !== field.newVal;

                                    if (!isDifferent) {
                                      return (
                                        <div key={field.key} className="flex items-center gap-4 text-sm">
                                          <span className="w-28 text-gray-500 font-medium">{field.label}</span>
                                          <span className="text-gray-400 text-xs">(same)</span>
                                          <span className="text-gray-700">{field.oldVal}</span>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div key={field.key} className="space-y-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium text-gray-700">{field.label}</span>
                                          <div className="flex gap-1">
                                            <button
                                              onClick={() => {
                                                setFieldChoices((prev) => ({
                                                  ...prev,
                                                  [mat.material_code]: { ...(prev[mat.material_code] || {}), [field.key]: 'old' },
                                                }));
                                              }}
                                              className={`text-xs px-2 py-0.5 rounded font-medium transition ${
                                                choice === 'old' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                              }`}
                                            >
                                              Old
                                            </button>
                                            {field.showMerge && (
                                              <button
                                                onClick={() => {
                                                  setFieldChoices((prev) => ({
                                                    ...prev,
                                                    [mat.material_code]: { ...(prev[mat.material_code] || {}), [field.key]: 'merge' },
                                                  }));
                                                }}
                                                className={`text-xs px-2 py-0.5 rounded font-medium transition ${
                                                  choice === 'merge' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                }`}
                                              >
                                                Merge
                                              </button>
                                            )}
                                            <button
                                              onClick={() => {
                                                setFieldChoices((prev) => ({
                                                  ...prev,
                                                  [mat.material_code]: { ...(prev[mat.material_code] || {}), [field.key]: 'new' },
                                                }));
                                              }}
                                              className={`text-xs px-2 py-0.5 rounded font-medium transition ${
                                                choice === 'new' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                              }`}
                                            >
                                              New
                                            </button>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className={`p-2 rounded text-xs font-mono ${choice === 'old' ? 'bg-gray-800 text-white ring-2 ring-gray-800' : 'bg-white text-gray-600 border border-gray-200'}`}>
                                            {field.oldVal || '-'}
                                          </div>
                                          <div className={`p-2 rounded text-xs font-mono ${choice === 'new' ? 'bg-blue-600 text-white ring-2 ring-blue-600' : 'bg-white text-gray-600 border border-gray-200'}`}>
                                            {field.newVal || '-'}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Non-smart mode: Simple existing materials list */}
                  {selectedMode !== 'smart' && (
                    <div className="border rounded-lg overflow-hidden">
                      <h4 className="font-medium p-3 bg-gray-50">Existing Materials Found:</h4>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">Code</th>
                              <th className="px-3 py-2 text-left font-medium">Old Description</th>
                              <th className="px-3 py-2 text-left font-medium">New Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {preview.existingMaterials.map((mat) => (
                              <tr key={mat.material_code}>
                                <td className="px-3 py-2 font-mono text-xs">{mat.material_code}</td>
                                <td className="px-3 py-2 text-gray-600">{mat.existing.description}</td>
                                <td className="px-3 py-2">{mat.newData.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setCurrentStep('upload');
                    setPreview(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import Materials
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            // Upload Form
            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Instructions:</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Download the template file first for correct formatting</li>
                  <li><strong>Description</strong> is the only required field</li>
                  <li><strong>Material Code</strong> is optional (auto-generated if empty)</li>
                  <li><strong>Material Code</strong> must be unique - duplicates in file will be auto-skipped (first occurrence kept)</li>
                  <li><strong>Material Type</strong> supports multiple types (comma-separated, e.g. &quot;Steel, Electrical&quot;)</li>
                  <li>Material types will be created automatically if they don&apos;t exist</li>
                  <li><strong>Unit</strong> defaults to &apos;pcs&apos; if empty</li>
                  <li>Maximum file size: 5MB</li>
                </ul>
              </div>

              {/* Download Template Button */}
              <button
                onClick={handleDownloadTemplate}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <Download className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700 font-medium">Download Excel Template</span>
              </button>

              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : file
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-blue-500 hover:bg-gray-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {file ? (
                  <div className="space-y-3">
                    <FileSpreadsheet className="w-12 h-12 text-green-600 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-green-700">{file.name}</p>
                      <p className="text-sm text-gray-600">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReset();
                      }}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-700">
                        {isDragging ? 'Drop your file here' : 'Drag & drop your Excel file'}
                      </p>
                      <p className="text-sm text-gray-500">
                        or click to browse (.xlsx, .xls)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-red-700 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">{error}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleClose}
                  disabled={isUploading}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePreview}
                  disabled={!file || isUploading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Preview Import
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
