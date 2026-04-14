'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { Inventory } from '@/types/spp.types';

interface InventoryEditModalProps {
  item: Inventory & { list_item?: string; spp_number?: string };
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemId: number, data: any) => Promise<void>;
}

export default function InventoryEditModal({
  item,
  isOpen,
  onClose,
  onSave,
}: InventoryEditModalProps) {
  const [formData, setFormData] = useState({
    quantity: item.quantity,
    condition_status: item.condition_status,
    location_id: item.location_id,
  });

  const [isSaving, setIsSaving] = useState(false);

  // Reset form when item changes
  useEffect(() => {
    setFormData({
      quantity: item.quantity,
      condition_status: item.condition_status,
      location_id: item.location_id,
    });
  }, [item]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(item.id, formData);
      onClose();
    } catch (error) {
      console.error('Failed to save inventory:', error);
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Inventory</h2>
            <p className="text-sm text-gray-600 mt-1">
              {item.list_item || item.material_description || 'Item'}
              {item.spp_number && ` • ${item.spp_number}`}
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
          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Condition Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condition Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, condition_status: 'GOOD' }))}
                className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg border transition ${
                  formData.condition_status === 'GOOD'
                    ? 'bg-green-100 border-green-300 text-green-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                ✓ GOOD
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, condition_status: 'DAMAGED' }))}
                className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg border transition ${
                  formData.condition_status === 'DAMAGED'
                    ? 'bg-red-100 border-red-300 text-red-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                ✗ DAMAGED
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, condition_status: 'CONSUMED' }))}
                className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg border transition ${
                  formData.condition_status === 'CONSUMED'
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                ⚠ CONSUMED
              </button>
            </div>
          </div>

          {/* Location (Optional - placeholder for future location management) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location <span className="text-gray-400 font-normal">(Coming soon)</span>
            </label>
            <select
              value={formData.location_id || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, location_id: e.target.value ? parseInt(e.target.value) : null }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              disabled
            >
              <option value="">No location assigned</option>
              {/* Location options will be added when location management is implemented */}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Location management will be available in a future update
            </p>
          </div>
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
            disabled={isSaving || formData.quantity <= 0}
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
