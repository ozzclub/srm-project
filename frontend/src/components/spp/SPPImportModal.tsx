'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, Download, AlertCircle, CheckCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import { sppApi } from '@/lib/api';

interface SPPImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ModalStep = 'upload' | 'preview' | 'result';

interface PreviewItem {
  no: number;
  list_item: string;
  description: string;
  unit: string;
  request_qty: number;
}

interface PreviewResult {
  total_rows: number;
  valid_count: number;
  failed_count: number;
  errors: string[];
  items: PreviewItem[];
}

interface ImportResult {
  total_rows: number;
  imported_count: number;
  failed_count: number;
  errors: string[];
  spp_requests: any[];
}

// Get today's date in the user's local timezone (YYYY-MM-DD)
// Uses browser's timezone so each user sees their own "today"
function getTodayLocal(): string {
  return new Date().toLocaleDateString('en-CA');
}

export default function SPPImportModal({ isOpen, onClose, onSuccess }: SPPImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<ModalStep>('upload');
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields for import
  const [requestDate, setRequestDate] = useState(getTodayLocal());
  const [requestedBy, setRequestedBy] = useState('');
  const [notes, setNotes] = useState('');

  // Editable items for preview
  const [editableItems, setEditableItems] = useState<PreviewItem[]>([]);

  const today = getTodayLocal();

  const handleClose = () => {
    setFile(null);
    setIsDragging(false);
    setIsLoading(false);
    setCurrentStep('upload');
    setPreviewData(null);
    setImportResult(null);
    setError(null);
    setRequestDate(getTodayLocal());
    setRequestedBy('');
    setNotes('');
    setEditableItems([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const validateAndSetFile = (selectedFile: File) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    const allowedExtensions = ['.xlsx', '.xls'];
    const hasValidExtension = allowedExtensions.some(ext =>
      selectedFile.name.toLowerCase().endsWith(ext)
    );

    if (!allowedTypes.includes(selectedFile.type) && !hasValidExtension) {
      setError('Only Excel files (.xlsx, .xls) are allowed');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError(null);
    setFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await sppApi.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'spp_request_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to download template');
      console.error('Template download error:', err);
    }
  };

  // Step 1 -> Step 2: Upload and preview
  const handlePreview = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await sppApi.importPreview(formData);
      const data = response.data.data as PreviewResult;
      
      setPreviewData(data);
      setEditableItems(data.items.map(item => ({ ...item })));
      setCurrentStep('preview');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Preview failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 -> Step 3: Confirm import
  const handleConfirmImport = async () => {
    if (!file || !requestDate || !requestedBy) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('request_date', requestDate);
      formData.append('requested_by', requestedBy);
      if (notes) formData.append('notes', notes);

      const response = await sppApi.import(formData);
      
      setImportResult(response.data.data);
      setCurrentStep('result');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Import failed';
      setError(message);

      // If we have result data even on error, show it
      if (err.response?.data?.data) {
        setImportResult(err.response.data.data);
        setCurrentStep('result');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    setError(null);
    setCurrentStep('upload');
    setRequestDate(getTodayLocal());
    setRequestedBy('');
    setNotes('');
    setEditableItems([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Update item in editable list
  const updateItem = (index: number, field: keyof PreviewItem, value: string | number) => {
    setEditableItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Add new row
  const addRow = () => {
    setEditableItems(prev => [
      ...prev,
      {
        no: prev.length + 1,
        list_item: '',
        description: '',
        unit: 'pcs',
        request_qty: 0,
      },
    ]);
  };

  // Remove row
  const removeRow = (index: number) => {
    if (editableItems.length <= 1) return;
    setEditableItems(prev => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, no: i + 1 })));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">
              {currentStep === 'upload' && 'Import SPP Request from Excel'}
              {currentStep === 'preview' && 'Preview & Edit Import'}
              {currentStep === 'result' && 'Import Result'}
            </h2>
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
          {currentStep === 'upload' && (
            // STEP 1: Upload
            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">How to Import:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>Download the Excel template</li>
                  <li>Fill in your SPP items</li>
                  <li>Upload the completed Excel file</li>
                  <li>Preview and edit the data before confirming</li>
                  <li>Review import results</li>
                </ol>
              </div>

              {/* Download Template */}
              <div>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Excel Template</span>
                </button>
              </div>

              {/* Upload Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : file
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {file ? (
                  <div className="space-y-2">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                    <p className="text-lg font-medium text-green-900">{file.name}</p>
                    <p className="text-sm text-green-700">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReset();
                      }}
                      className="text-sm text-gray-600 hover:text-gray-800 underline"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <p className="text-lg font-medium text-gray-700">
                      Drag & drop your Excel file here
                    </p>
                    <p className="text-sm text-gray-500">
                      or click to browse
                    </p>
                    <p className="text-xs text-gray-400">
                      Supports .xlsx and .xls (max 5MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePreview}
                  disabled={!file || isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Preview Data</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {currentStep === 'preview' && (
            // STEP 2: Preview & Edit
            <div className="space-y-6">
              {/* Header Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900">Import Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Request Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={requestDate}
                      onChange={(e) => setRequestDate(e.target.value)}
                      min={today}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Requested By <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={requestedBy}
                      onChange={(e) => setRequestedBy(e.target.value)}
                      placeholder="Enter name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Preview Errors */}
              {previewData && previewData.errors.length > 0 && (
                <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium text-yellow-900">
                        {previewData.failed_count} row(s) had errors and will be skipped:
                      </h4>
                      <ul className="mt-2 space-y-1">
                        {previewData.errors.map((err, idx) => (
                          <li key={idx} className="text-sm text-yellow-700">
                            • {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Editable Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">
                    Items ({editableItems.length})
                  </h3>
                  <button
                    onClick={addRow}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Add Row
                  </button>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-12">No</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">List Item</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">Unit</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Qty</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {editableItems.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <span className="text-gray-500">{item.no}</span>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.list_item}
                              onChange={(e) => updateItem(index, 'list_item', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                              required
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                              required
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => updateItem(index, 'unit', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                              required
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.request_qty}
                              onChange={(e) => updateItem(index, 'request_qty', parseFloat(e.target.value) || 0)}
                              min={0}
                              step="0.01"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                              required
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => removeRow(index)}
                              disabled={editableItems.length <= 1}
                              className="text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                              title="Remove row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setCurrentStep('upload');
                    setPreviewData(null);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={isLoading || !requestDate || !requestedBy || editableItems.length === 0}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Confirm Import ({editableItems.length} items)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {currentStep === 'result' && importResult && (
            // STEP 3: Result
            <div className="space-y-4">
              {/* Summary */}
              <div className={`p-4 rounded-lg ${
                importResult.failed_count === 0 ? 'bg-green-50' : 'bg-yellow-50'
              }`}>
                <div className="flex items-start gap-3">
                  {importResult.failed_count === 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">
                      {importResult.failed_count === 0
                        ? 'Import Successful'
                        : 'Import Completed with Errors'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Total rows: {importResult.total_rows} |
                      Imported: <span className="text-green-600 font-medium">{importResult.imported_count}</span> |
                      Failed: <span className="text-red-600 font-medium">{importResult.failed_count}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <h4 className="font-medium text-red-900 mb-2">Errors:</h4>
                  <ul className="space-y-1">
                    {importResult.errors.map((err, idx) => (
                      <li key={idx} className="text-sm text-red-700">
                        • {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success Message */}
              {importResult.spp_requests && importResult.spp_requests.length > 0 && (
                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <h4 className="font-medium text-green-900 mb-2">Imported SPP Requests:</h4>
                  <ul className="space-y-1">
                    {importResult.spp_requests.map((spp: any, idx: number) => (
                      <li key={idx} className="text-sm text-green-700 font-mono">
                        ✓ {spp.spp_number} ({spp.items?.length || 0} items)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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
                    if (importResult.failed_count === 0) {
                      onSuccess();
                      handleClose();
                    }
                  }}
                  disabled={importResult.failed_count > 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
