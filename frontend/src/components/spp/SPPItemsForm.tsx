'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { materialApi } from '@/lib/api';
import type { CreateSPPItemDTO } from '@/types/spp.types';

interface SPPItemsFormProps {
  items: CreateSPPItemDTO[];
  onChange: (items: CreateSPPItemDTO[]) => void;
  mode?: 'create' | 'edit';
}

interface FormItem extends CreateSPPItemDTO {
  _tempId: string;
  material_id_temp?: number;
}

export default function SPPItemsForm({ items, onChange, mode = 'create' }: SPPItemsFormProps) {
  const [formItems, setFormItems] = useState<FormItem[]>([]);

  // Fetch materials for dropdown
  const { data: materialsData } = useQuery({
    queryKey: ['materials'],
    queryFn: () => materialApi.getAll().then((res) => res.data),
  });

  const materials = materialsData?.data || [];

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
        const updatedItem = { ...item, [field]: value };

        // Auto-fill from material selection
        if (field === 'material_id') {
          const selectedMaterial = materials.find((m: any) => m.id === parseInt(value));
          if (selectedMaterial) {
            updatedItem.list_item = selectedMaterial.description || '';
            updatedItem.description = selectedMaterial.remarks || '';
            updatedItem.unit = selectedMaterial.unit || 'pcs';
          }
        }

        return updatedItem;
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
                Material
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                List Item
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">
                Unit
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">
                Request Qty
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-40">
                Date Required
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
                  <select
                    value={item.material_id || ''}
                    onChange={(e) => updateField(item._tempId, 'material_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Select material...</option>
                    {materials.map((material: any) => (
                      <option key={material.id} value={material.id}>
                        {material.material_code} - {material.description}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={item.list_item || ''}
                    onChange={(e) => updateField(item._tempId, 'list_item', e.target.value)}
                    placeholder="Material name (e.g., Steel Pipe)"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
              <select
                value={item.material_id || ''}
                onChange={(e) => updateField(item._tempId, 'material_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select material...</option>
                {materials.map((material: any) => (
                  <option key={material.id} value={material.id}>
                    {material.material_code} - {material.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">List Item (Material Name)</label>
              <input
                type="text"
                value={item.list_item || ''}
                onChange={(e) => updateField(item._tempId, 'list_item', e.target.value)}
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
