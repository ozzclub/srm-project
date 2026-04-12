'use client';

import { useState } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface DeleteModalProps {
  isOpen: boolean;
  transactionId: string;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export default function DeleteModal({
  isOpen,
  transactionId,
  onCancel,
  onConfirm,
  isDeleting = false,
}: DeleteModalProps) {
  const [confirmText, setConfirmText] = useState('');

  const isConfirmed = confirmText === transactionId;

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
    }
  };

  const handleClose = () => {
    setConfirmText('');
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2
              id="delete-modal-title"
              className="text-xl font-bold text-gray-900"
            >
              Delete Transaction
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="p-2 rounded-lg hover:bg-gray-100 transition focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-2">
                ⚠️ This action cannot be undone
              </p>
              <p className="text-sm text-red-700">
                You are about to permanently delete this transaction and all
                associated data.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Transaction Details:
              </p>
              <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm text-gray-900">
                {transactionId}
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirm-input"
                className="text-sm font-medium text-gray-700"
              >
                Type{' '}
                <span className="font-mono font-bold text-gray-900">
                  {transactionId}
                </span>{' '}
                to confirm:
              </label>
              <input
                id="confirm-input"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Enter transaction ID"
                disabled={isDeleting}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isConfirmed) {
                    handleConfirm();
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmed || isDeleting}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:ring-2 focus:ring-red-500 active:scale-95"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
