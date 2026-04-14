'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CreateSPPItemDTO } from '@/types/spp.types';

interface SPPItemsFormProps {
  items: CreateSPPItemDTO[];
  onChange: (items: CreateSPPItemDTO[]) => void;
  mode?: 'create' | 'edit';
}

interface FormItem extends CreateSPPItemDTO {
  _tempId: string;
}

export default function SPPItemsForm({ items, onChange, mode = 'create' }: SPPItemsFormProps) {
  const [formItems, setFormItems] = useState<FormItem[]>([]);

  // Initialize form items
  useEffect(() => {
    if (items.length === 0) {
      // Add one empty row by default
      addRow();
    } else {
      const initializedItems = items.map((item, index) => ({
        ...item,
        _tempId: `item-${Date.now()}-${index}`,
      }));
      setFormItems(initializedItems);
    }
  }, []);

  // Add new row
  const addRow = () => {
    const newItem: FormItem = {
      _tempId: `item-${Date.now()}`,
      list_item: '',
      description: '',
      unit: 'pcs',
      request_qty: 0,
      date_req: new Date().toLocaleDateString('en-CA'),
      item_type: 'MATERIAL',
    };
    const updatedItems = [...formItems, newItem];
    setFormItems(updatedItems);
    emitChange(updatedItems);
  };

  // Remove row
  const removeRow = (tempId: string) => {
    if (formItems.length <= 1) return; // Keep at least one row
    const updatedItems = formItems.filter((item) => item._tempId !== tempId);
    setFormItems(updatedItems);
    emitChange(updatedItems);
  };

  // Update field
  const updateField = (tempId: string, field: keyof CreateSPPItemDTO, value: any) => {
    const updatedItems = formItems.map((item) => {
      if (item._tempId === tempId) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setFormItems(updatedItems);
    emitChange(updatedItems);
  };

  // Emit changes to parent
  const emitChange = (items: FormItem[]) => {
    const cleanItems = items.map(({ _tempId, ...rest }) => rest);
    onChange(cleanItems);
  };

  // Get today's date as default
  const today = new Date().toLocaleDateString('en-CA');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Items</h3>
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                No
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                List Item
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48">
                Remarks (Keperluan)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">
                Unit
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">
                Request Qty
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">
                Date Required
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48">
                Item Type
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {formItems.map((item, index) => (
              <tr key={item._tempId} className="bg-white hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-gray-900">{index + 1}</span>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={item.list_item || ''}
                    onChange={(e) => updateField(item._tempId, 'list_item', e.target.value)}
                    placeholder="Enter item name (e.g., Steel Pipe)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateField(item._tempId, 'description', e.target.value)}
                    placeholder="Item description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                </td>
                <td className="px-4 py-3">
                  <textarea
                    value={item.remarks || ''}
                    onChange={(e) => updateField(item._tempId, 'remarks', e.target.value)}
                    placeholder="Untuk keperluan apa..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(e) => updateField(item._tempId, 'unit', e.target.value)}
                    placeholder="pcs"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={item.request_qty}
                    onChange={(e) =>
                      updateField(item._tempId, 'request_qty', parseFloat(e.target.value) || 0)
                    }
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="date"
                    value={item.date_req}
                    onChange={(e) => updateField(item._tempId, 'date_req', e.target.value)}
                    min={today}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateField(item._tempId, 'item_type', 'TOOL')}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition ${
                        item.item_type === 'TOOL'
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      🔧 Tool
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField(item._tempId, 'item_type', 'MATERIAL')}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition ${
                        item.item_type === 'MATERIAL'
                          ? 'bg-green-50 border-green-300 text-green-700'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      📦 Consumable
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(item._tempId)}
                    disabled={formItems.length <= 1}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {formItems.map((item, index) => (
          <div key={item._tempId} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Item {index + 1}</span>
              <button
                type="button"
                onClick={() => removeRow(item._tempId)}
                disabled={formItems.length <= 1}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">List Item (Item Name)</label>
              <input
                type="text"
                value={item.list_item || ''}
                onChange={(e) => updateField(item._tempId, 'list_item', e.target.value)}
                placeholder="Enter item name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateField(item._tempId, 'description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks <span className="text-gray-400 font-normal">(Keperluan)</span>
              </label>
              <textarea
                value={item.remarks || ''}
                onChange={(e) => updateField(item._tempId, 'remarks', e.target.value)}
                placeholder="Untuk keperluan apa..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <input
                  type="text"
                  value={item.unit}
                  onChange={(e) => updateField(item._tempId, 'unit', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  value={item.request_qty}
                  onChange={(e) =>
                    updateField(item._tempId, 'request_qty', parseFloat(e.target.value) || 0)
                  }
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Item Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateField(item._tempId, 'item_type', 'TOOL')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border transition ${
                    item.item_type === 'TOOL'
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  🔧 Tool
                </button>
                <button
                  type="button"
                  onClick={() => updateField(item._tempId, 'item_type', 'MATERIAL')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border transition ${
                    item.item_type === 'MATERIAL'
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  📦 Consumable
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Required</label>
              <input
                type="date"
                value={item.date_req}
                onChange={(e) => updateField(item._tempId, 'date_req', e.target.value)}
                min={today}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
