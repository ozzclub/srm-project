import { Plus, Trash2 } from 'lucide-react';
import { UseFieldArrayReturn, UseFormRegister, FieldErrors, Control, Controller } from 'react-hook-form';
import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@/components/ui/combobox';

interface MTOItem {
  material_id: number;
  requested_qty: number;
  notes: string;
}

interface MTOItemsFormProps {
  register: UseFormRegister<any>;
  fieldArray: UseFieldArrayReturn<any>;
  materials: Array<{
    id: number;
    material_code: string;
    description: string;
    remarks: string;
    unit: string;
  }>;
  errors: FieldErrors<any>;
  control: any;
}

export default function MTOItemsForm({
  register,
  fieldArray,
  materials,
  errors,
  control,
}: MTOItemsFormProps) {
  const { fields, append, remove } = fieldArray;

  const handleAddItem = () => {
    append({ material_id: '', requested_qty: 0, notes: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">MTO Items</h3>
        <button
          type="button"
          onClick={handleAddItem}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {fields.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">No items added yet. Click "Add Item" to start.</p>
        </div>
      )}

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="bg-gray-50 rounded-lg p-4 border border-gray-200 relative"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-700">Item #{index + 1}</span>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-red-600 hover:text-red-700 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Material Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Material *
                </label>
                <Controller
                  name={`items.${index}.material_id`}
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      items={materials}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <ComboboxInput placeholder="Select material..." showClear />
                      <ComboboxContent>
                        <ComboboxEmpty>No material found.</ComboboxEmpty>
                        <ComboboxList>
                          {(m: any) => (
                            <ComboboxItem key={m.id} value={m.id}>
                              {m.material_code} - {m.description}
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  )}
                />
                {((errors.items as any)?.[index]?.material_id) && (
                  <p className="text-red-600 text-xs mt-1">
                    {((errors.items as any)?.[index]?.material_id)?.message}
                  </p>
                )}
              </div>

              {/* Requested Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Qty *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...register(`items.${index}.requested_qty`, {
                    valueAsNumber: true,
                    validate: (value) => value > 0 || 'Quantity must be greater than 0',
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="0.00"
                />
                {((errors.items as any)?.[index]?.requested_qty) && (
                  <p className="text-red-600 text-xs mt-1">
                    {((errors.items as any)?.[index]?.requested_qty)?.message}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  {...register(`items.${index}.notes`)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Additional notes"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {errors.items && (
        <p className="text-red-600 text-sm font-medium">At least one item is required</p>
      )}
    </div>
  );
}
