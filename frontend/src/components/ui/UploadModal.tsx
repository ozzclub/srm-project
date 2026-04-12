'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi } from '@/lib/api';
import { toastManager } from '@/components/ui/Toast';
import { X, Upload, Image as ImageIcon, FileText, Trash2, Camera, File } from 'lucide-react';
import Image from 'next/image';

interface UploadModalProps {
  isOpen: boolean;
  transactionId: string;
  onClose: () => void;
}

type TabType = 'photos' | 'documents';

export default function UploadModal({ isOpen, transactionId, onClose }: UploadModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('photos');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => documentApi.upload(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', transactionId] });
      toastManager.success('Files uploaded successfully');
      handleClose();
    },
    onError: () => {
      toastManager.error('Failed to upload files');
    },
  });

  const handleClose = () => {
    setSelectedFiles([]);
    setIsDragOver(false);
    onClose();
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    const validFiles = Array.from(files).filter((file) => {
      if (file.size > maxSize) {
        toastManager.error(`${file.name} exceeds 5MB limit`);
        return false;
      }
      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) return;

    const formData = new FormData();
    formData.append('transaction_id', transactionId);
    formData.append('category', activeTab === 'photos' ? 'photo' : 'document');

    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    uploadMutation.mutate(formData);
  };

  const isImageFile = (file: File) => file.type.startsWith('image/');

  const getFileIcon = (file: File) => {
    if (file.type.includes('pdf')) return FileText;
    return File;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-xl font-bold text-gray-900">Upload Files</h2>
          <button
            onClick={handleClose}
            disabled={uploadMutation.isPending}
            className="p-2 rounded-lg hover:bg-gray-100 transition focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => {
                setActiveTab('photos');
                setSelectedFiles([]);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'photos'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Camera className="w-4 h-4" />
              Photos
            </button>
            <button
              onClick={() => {
                setActiveTab('documents');
                setSelectedFiles([]);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'documents'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              Documents
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
              isDragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            {activeTab === 'photos' ? (
              <ImageIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            ) : (
              <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            )}
            <p className="text-sm text-gray-700 font-medium mb-1">
              {isDragOver ? 'Drop files here' : `Drop ${activeTab} here`}
            </p>
            <p className="text-xs text-gray-500">or click to browse • Max 5MB per file</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={activeTab === 'photos' ? 'image/*' : '.pdf,.doc,.docx,.xls,.xlsx'}
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Selected Files ({selectedFiles.length})
              </p>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    {isImageFile(file) ? (
                      <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                        <Image
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
                        {(() => {
                          const Icon = getFileIcon(file);
                          return <Icon className="w-6 h-6 text-gray-400" />;
                        })()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      disabled={uploadMutation.isPending}
                      className="p-1.5 hover:bg-red-50 rounded transition disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={handleClose}
            disabled={uploadMutation.isPending}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploadMutation.isPending}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploadMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload ({selectedFiles.length})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
