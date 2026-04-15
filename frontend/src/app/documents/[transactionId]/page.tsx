'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useParams, useRouter } from 'next/navigation';
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  X,
  ArrowLeft,
  FileText,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend.jastipravita.co/api';
const UPLOADS_URL = process.env.NEXT_PUBLIC_UPLOADS_URL || 'https://backend.jastipravita.co';

export default function DocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const transactionId = params.transactionId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['documents', transactionId],
    queryFn: () =>
      documentApi.getByTransactionId(transactionId).then((res) => res.data.data),
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => documentApi.upload(formData),
    onMutate: () => setUploading(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', transactionId] });
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: () => setUploading(false),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => documentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', transactionId] });
    },
  });

  const documents: any[] = documentsData || [];

  const filteredDocuments =
    selectedCategory === 'ALL'
      ? documents
      : documents.filter((doc: any) => doc.category === selectedCategory);

  const categorySet = new Set<string>();
  documents.forEach((d) => categorySet.add(String(d.category)));
  const categories: string[] = ['ALL', ...Array.from(categorySet)];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    formData.append('transaction_id', transactionId);
    formData.append('category', selectedCategory === 'ALL' ? 'GENERAL' : selectedCategory);

    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    uploadMutation.mutate(formData);
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

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    formData.append('transaction_id', transactionId);
    formData.append('category', selectedCategory === 'ALL' ? 'GENERAL' : selectedCategory);

    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    uploadMutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate(id);
    }
  };

  const isImage = (mimeType: string) => {
    return mimeType.startsWith('image/');
  };

  const getFileUrl = (fileUrl: string) => {
    return `${UPLOADS_URL}/uploads/${transactionId}/${fileUrl}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/movement-log"
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Documents
              </h1>
              <p className="text-sm text-gray-600">Transaction: {transactionId}</p>
            </div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
          >
            <Upload className="w-5 h-5" />
            <span>{uploading ? 'Uploading...' : 'Upload Files'}</span>
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
          <p className="text-gray-700 font-medium mb-2">
            {isDragging ? 'Drop files here to upload' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-gray-500 mb-4">or</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95"
          >
            <Upload className="w-5 h-5" />
            <span>{uploading ? 'Uploading...' : 'Browse Files'}</span>
          </button>
          <p className="text-xs text-gray-500 mt-3">
            Supported: Images, PDF, Word, Excel (Max 10MB each)
          </p>
        </div>

        {/* Category Filter */}
        {categories.length > 1 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Gallery */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            Loading...
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No documents found</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                <Upload className="w-5 h-5" />
                <span>Upload your first file</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredDocuments.map((doc: any) => (
              <div
                key={doc.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden group hover:shadow-md transition-all duration-200"
              >
                {/* Preview */}
                <div className="relative aspect-square bg-gray-100 flex items-center justify-center">
                  {isImage(doc.mime_type) ? (
                    <Image
                      src={getFileUrl(doc.file_url)}
                      alt={doc.file_name}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover cursor-pointer"
                      onClick={() => setPreviewImage(getFileUrl(doc.file_url))}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-16 h-16 text-gray-400" />
                      <span className="text-xs text-gray-500 px-2 text-center">
                        {doc.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}
                      </span>
                    </div>
                  )}

                  {/* Overlay actions - always visible on mobile, hover on desktop */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 sm:transition-opacity lg:hidden sm:opacity-100">
                    {isImage(doc.mime_type) && (
                      <button
                        onClick={() => setPreviewImage(getFileUrl(doc.file_url))}
                        className="p-1.5 bg-white rounded-lg shadow hover:bg-gray-100 transition focus:ring-2 focus:ring-gray-500"
                        aria-label="Preview image"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 bg-white rounded-lg shadow hover:bg-gray-100 transition focus:ring-2 focus:ring-red-500"
                      aria-label="Delete file"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 truncate" title={doc.file_name}>
                    {doc.file_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatFileSize(doc.file_size)}
                  </p>
                  <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                    {doc.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 bg-white rounded-lg hover:bg-gray-100"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
          <div className="relative max-w-4xl max-h-[90vh]">
            <Image
              src={previewImage}
              alt="Preview"
              width={1200}
              height={800}
              className="object-contain"
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
