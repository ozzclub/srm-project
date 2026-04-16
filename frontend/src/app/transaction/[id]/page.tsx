'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { movementLogApi, documentApi } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MovementLogForm from '@/components/forms/MovementLogForm';
import DeleteModal from '@/components/ui/DeleteModal';
import UploadModal from '@/components/ui/UploadModal';
import { ToastContainer, useToasts, toastManager } from '@/components/ui/Toast';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Trash2,
  Copy,
  Check,
  Edit3,
  X,
  Save,
  Loader2,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  FileText,
  File,
  Eye,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend.jastipravita.co/api';
const UPLOADS_URL = process.env.NEXT_PUBLIC_UPLOADS_URL || 'https://backend.jastipravita.co';

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('id-ID', {
    timeZone: 'Asia/Jayapura',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.includes('pdf')) return FileText;
  return File;
}

function getFileUrl(transactionId: string, fileUrl: string): string {
  return `${UPLOADS_URL}/uploads/${transactionId}/${fileUrl}`;
}

function TransactionDetail() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toasts, removeToast } = useToasts();

  const transactionId = params.id as string;
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [docToDelete, setDocToDelete] = useState<any>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const { data: logData, isLoading, error, refetch } = useQuery({
    queryKey: ['movement-log', transactionId],
    queryFn: () => movementLogApi.getById(transactionId).then((res) => res.data.data),
    enabled: !!transactionId,
  });

  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ['documents', transactionId],
    queryFn: () => documentApi.getByTransactionId(transactionId).then((res) => res.data.data),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => movementLogApi.update(transactionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movement-log', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['movement-logs'] });
      setIsEditing(false);
      toastManager.success('Transaction updated');
    },
    onError: () => toastManager.error('Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => movementLogApi.delete(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movement-logs'] });
      toastManager.success('Transaction deleted');
      setTimeout(() => router.push('/movement-log'), 1000);
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id: number) => documentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', transactionId] });
      toastManager.success('File deleted');
    },
  });

  const handleSubmit = (data: any) => updateMutation.mutate(data);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(transactionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyMaterialCode = async () => {
    if (!logData?.material?.material_code) return;
    try {
      await navigator.clipboard.writeText(logData.material.material_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const images = documents?.filter((d: any) => d.mime_type?.startsWith('image/')) || [];
  const files = documents?.filter((d: any) => !d.mime_type?.startsWith('image/')) || [];

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download:', error);
      toastManager.error('Failed to download file');
    }
  };

  const handleDeleteDoc = (doc: any) => {
    setDocToDelete(doc);
  };

  const confirmDeleteDoc = () => {
    if (docToDelete) {
      deleteDocMutation.mutate(docToDelete.id);
      setDocToDelete(null);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || images.length === 0) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && previewIndex !== null && previewIndex < images.length - 1) {
      setPreviewIndex(previewIndex + 1);
    }
    if (isRightSwipe && previewIndex !== null && previewIndex > 0) {
      setPreviewIndex(previewIndex - 1);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Keyboard navigation for gallery
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewIndex === null) return;

      if (e.key === 'Escape') {
        setPreviewIndex(null);
      } else if (e.key === 'ArrowLeft' && previewIndex > 0) {
        setPreviewIndex(previewIndex - 1);
      } else if (e.key === 'ArrowRight' && previewIndex < images.length - 1) {
        setPreviewIndex(previewIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewIndex, images.length]);

  // Loading
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-8 animate-pulse space-y-6">
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error
  if (error || !logData) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-medium text-gray-900 mb-1">
            {error ? 'Failed to Load' : 'Not Found'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {error ? 'Unable to fetch details' : 'Transaction does not exist'}
          </p>
          <div className="flex gap-2 justify-center">
            {error && (
              <button onClick={() => refetch()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
                <RefreshCw className="w-4 h-4 inline mr-1" /> Retry
              </button>
            )}
            <button onClick={() => router.push('/movement-log')} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm">
              Back
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Edit Mode
  if (isEditing) {
    return (
      <DashboardLayout>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsEditing(false)} className="p-1.5 hover:bg-gray-100 rounded transition">
                <X className="w-4 h-4 text-gray-600" />
              </button>
              <div>
                <p className="font-medium text-gray-900">Edit Transaction</p>
                <p className="text-xs text-gray-500 font-mono">{transactionId}</p>
              </div>
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('save-form'))}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm font-medium"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-900">
            <MovementLogForm
              initialData={logData}
              onSubmit={handleSubmit}
              isLoading={updateMutation.isPending}
              isEdit
            />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // View Mode
  return (
    <DashboardLayout>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="max-w-2xl mx-auto space-y-6 py-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/movement-log')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowUploadModal(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Upload Files"
            >
              <Upload className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Edit"
            >
              <Edit3 className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 hover:bg-red-50 rounded-lg transition"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>

        {/* Main Info Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Transaction ID</span>
              <p className="text-sm text-gray-500 font-mono">{transactionId}</p>
              <button onClick={copyId} className="p-1 hover:bg-gray-100 rounded transition" title="Copy Transaction ID">
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
              </button>
            </div>
            
            {logData.material?.material_code && (
              <>
                <div className="h-4 w-px bg-gray-200 hidden sm:block"></div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Material Code</span>
                  <p className="text-sm text-gray-500 font-mono">{logData.material.material_code}</p>
                  <button onClick={copyMaterialCode} className="p-1 hover:bg-gray-100 rounded transition" title="Copy Material Code">
                    {codeCopied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                  </button>
                </div>
              </>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {logData.material?.description || 'Unknown Material'}
          </h1>

          {logData.material?.specification && (
            <p className="text-sm text-gray-500 mb-3">{logData.material.specification}</p>
          )}

          <p className="text-4xl font-bold text-blue-600 mb-1">
            {logData.qty || '-'}
            <span className="text-lg font-normal text-gray-500 ml-2">
              {logData.material?.unit || ''}
            </span>
          </p>

          <p className="text-sm text-gray-500">
            {formatDate(logData.transaction_date)}
          </p>
        </div>

        {/* Route */}
        {(logData.from_location || logData.to_location) && (
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="text-center">
                <p className="font-medium text-gray-900">
                  {logData.from_location?.location_name || '-'}
                </p>
                <p className="text-xs text-gray-500">From</p>
              </div>
              <span className="text-gray-300">→</span>
              <div className="text-center">
                <p className="font-medium text-gray-900">
                  {logData.to_location?.location_name || '-'}
                </p>
                <p className="text-xs text-gray-500">To</p>
              </div>
            </div>
          </div>
        )}

        {/* Other Info */}
        <div className="grid grid-cols-2 gap-3">
          {logData.vehicle_driver && (
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 mb-0.5">Driver</p>
              <p className="text-sm font-medium text-gray-900 truncate">{logData.vehicle_driver}</p>
            </div>
          )}
          {logData.document_no && (
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 mb-0.5">Document No</p>
              <Link
                href={`/do-number/${logData.document_no}`}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 truncate block hover:underline"
              >
                {logData.document_no}
              </Link>
            </div>
          )}
          {logData.received_by && (
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 mb-0.5">Received By</p>
              <p className="text-sm font-medium text-gray-900 truncate">{logData.received_by}</p>
            </div>
          )}
          {logData.movement_type && (
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 mb-0.5">Movement Type</p>
              <p className="text-sm font-medium text-gray-900 truncate">{logData.movement_type.name}</p>
            </div>
          )}
        </div>

        {/* Trip Info */}
        {logData.trip_id && (
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Trip ID</p>
                <Link
                  href={`/trip-id/${logData.trip_id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 font-mono hover:underline"
                >
                  {logData.trip_id}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Timing */}
        {(logData.loading_time || logData.unloading_time) && (
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-3">Timing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {logData.loading_time && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Loading Time</p>
                  <p className="text-sm font-medium text-gray-900">{formatDateTime(logData.loading_time)}</p>
                </div>
              )}
              {logData.unloading_time && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Unloading Time</p>
                  <p className="text-sm font-medium text-gray-900">{formatDateTime(logData.unloading_time)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {logData.condition_notes && (
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2">Notes</h3>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{logData.condition_notes}</p>
          </div>
        )}

        {/* Documentation Link */}
        {logData.documentation_link && (
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2">Documentation Link</h3>
            <a
              href={logData.documentation_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline break-all"
            >
              {logData.documentation_link}
            </a>
          </div>
        )}

        {/* Documentation Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Documentation</h2>

          {/* Images */}
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-2">Photos</h3>
            {images.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No photos uploaded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {images.map((doc: any, index: number) => (
                  <div key={doc.id} className="relative group aspect-square">
                    <Image
                      src={getFileUrl(transactionId, doc.file_url)}
                      alt={doc.file_name}
                      fill
                      sizes="(max-width: 768px) 50vw, 33vw"
                      className="object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition rounded-lg">
                      <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={(e) => { e.stopPropagation(); setPreviewIndex(index); }}
                          className="p-1.5 bg-white rounded hover:bg-gray-100"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-gray-700" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownload(getFileUrl(transactionId, doc.file_url), doc.file_name); }}
                          className="p-1.5 bg-white rounded hover:bg-gray-100"
                          title="Download"
                        >
                          <Download className="w-4 h-4 text-gray-700" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc); }}
                          className="p-1.5 bg-white rounded hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-b-lg">
                      <p className="text-xs text-white truncate">{doc.file_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Files */}
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-2">Documents</h3>
            {files.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No documents uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((doc: any) => {
                  const FileIcon = getFileIcon(doc.mime_type);
                  return (
                    <div key={doc.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(doc.file_size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDownload(getFileUrl(transactionId, doc.file_url), doc.file_name)}
                          className="p-1.5 hover:bg-gray-100 rounded transition"
                          title="Download"
                        >
                          <Download className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteDoc(doc)}
                          className="p-1.5 hover:bg-red-50 rounded transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          {formatDate(logData.created_at)}
          {logData.created_by_user && ` • ${logData.created_by_user.name}`}
        </p>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        transactionId={transactionId}
        onClose={() => setShowUploadModal(false)}
      />

      {/* Delete Modal */}
      <DeleteModal
        isOpen={showDeleteModal}
        transactionId={transactionId}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() => deleteMutation.mutate()}
        isDeleting={deleteMutation.isPending}
      />

      {/* Image Preview Modal */}
      {previewIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setPreviewIndex(null)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close button */}
          <button
            onClick={() => setPreviewIndex(null)}
            className="absolute top-4 right-4 z-60 p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Image counter */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-60 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
            {previewIndex + 1} / {images.length}
          </div>

          {/* Previous button */}
          {previewIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewIndex(previewIndex - 1);
              }}
              className="absolute left-4 z-60 p-3 bg-white/10 hover:bg-white/20 rounded-full transition"
            >
              <ChevronLeft className="w-8 h-8 text-white" />
            </button>
          )}

          {/* Next button */}
          {previewIndex < images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewIndex(previewIndex + 1);
              }}
              className="absolute right-4 z-60 p-3 bg-white/10 hover:bg-white/20 rounded-full transition"
            >
              <ChevronRight className="w-8 h-8 text-white" />
            </button>
          )}

          {/* Image */}
          <div className="relative w-full h-full flex items-center justify-center p-16">
            <Image
              src={getFileUrl(transactionId, images[previewIndex].file_url)}
              alt={images[previewIndex].file_name}
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default TransactionDetail;
