'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import type { SPPItem, UpdateSPPItemDTO } from '@/types/spp.types';

interface SPPItemEditModalProps {
  item: SPPItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemId: number, data: UpdateSPPItemDTO) => Promise<void>;
}

export default function SPPItemEditModal({
  item,
  isOpen,
  onClose,
  onSave,
}: SPPItemEditModalProps) {
  const [formData, setFormData] = useState<UpdateSPPItemDTO>({
    list_item: item.list_item,
    description: item.description,
    remarks: item.remarks || '',
    unit: item.unit,
    request_qty: item.request_qty,
    receive_qty: item.receive_qty,
    date_req: item.date_req,
    item_type: item.item_type,
  });

  const [isSaving, setIsSaving] = useState(false);

  // Reset form when item changes
  useEffect(() => {
    setFormData({
      list_item: item.list_item,
      description: item.description,
      remarks: item.remarks || '',
      unit: item.unit,
      request_qty: item.request_qty,
      receive_qty: item.receive_qty,
      date_req: item.date_req,
      item_type: item.item_type,
    });
  }, [item]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(item.id, formData);
      onClose();
    } catch (error) {
      console.error('Failed to save item:', error);
      alert('Gagal menyimpan perubahan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Item</h2>
            <p className="text-sm text-gray-600 mt-1">
              {item.delivery_status === 'VERIFIED' ? (
                <span className="text-orange-600">
                  ⚠️ Item sudah diverifikasi - perubahan akan update inventory juga
                </span>
              ) : (
                'Ubah data item sesuai kebutuhan'
              )}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Item <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.list_item || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, list_item: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deskripsi (Spesifikasi)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks (Keperluan)
            </label>
            <textarea
              value={formData.remarks || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Untuk keperluan apa..."
            />
          </div>

          {/* Row 1: Unit, Request Qty, Receive Qty */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Request Qty
              </label>
              <input
                type="number"
                value={formData.request_qty}
                onChange={(e) => setFormData(prev => ({ ...prev, request_qty: parseFloat(e.target.value) || 0 }))}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Received Qty
              </label>
              <input
                type="number"
                value={formData.receive_qty}
                onChange={(e) => setFormData(prev => ({ ...prev, receive_qty: parseFloat(e.target.value) || 0 }))}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Date Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Required
            </label>
            <input
              type="date"
              value={formData.date_req}
              onChange={(e) => setFormData(prev => ({ ...prev, date_req: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Item Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipe Item
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, item_type: 'TOOL' }))}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition ${
                  formData.item_type === 'TOOL'
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                🔧 Tool
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, item_type: 'MATERIAL' }))}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition ${
                  formData.item_type === 'MATERIAL'
                    ? 'bg-green-100 border-green-300 text-green-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                📦 Consumable
              </button>
            </div>
          </div>

          {/* Warning if item is already verified */}
          {item.delivery_status === 'VERIFIED' && (
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-900">Perhatian!</p>
                <p className="text-sm text-orange-700 mt-1">
                  Item ini sudah diverifikasi dan masuk ke inventory. Perubahan pada 
                  <strong> Received Qty</strong> atau <strong>Tipe Item</strong> akan otomatis mengupdate data inventory juga.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !formData.list_item}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan Perubahan'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
