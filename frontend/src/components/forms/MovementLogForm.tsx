'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { materialApi, locationApi, movementTypeApi } from '@/lib/api';
import { MovementLog } from '@/types';
import { generateTransactionId } from '@/lib/utils';
import { useEffect } from 'react';
import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@/components/ui/combobox';

const movementLogSchema = z.object({
  transaction_id: z.string().min(1, 'Required'),
  transaction_date: z.string().min(1, 'Required'),
  trip_id: z.string().optional(),
  document_no: z.string().optional(),
  material_id: z.number().min(1, 'Required'),
  qty: z.number().min(0.01, 'Must be > 0'),
  from_location_id: z.number().min(1, 'Required'),
  to_location_id: z.number().min(1, 'Required'),
  movement_type_id: z.number().min(1, 'Required'),
  vehicle_driver: z.string().optional(),
  received_by: z.string().optional(),
  loading_time: z.string().optional(),
  unloading_time: z.string().optional(),
  condition_notes: z.string().optional(),
});

type MovementLogFormData = z.infer<typeof movementLogSchema>;

interface MovementLogFormProps {
  initialData?: MovementLog | null;
  onSubmit: (data: MovementLogFormData) => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

export default function MovementLogForm({
  initialData,
  onSubmit,
  isLoading,
  isEdit,
}: MovementLogFormProps) {
  // Convert UTC datetime string from DB to WIT (UTC+9) datetime-local input format
  const utcToWitInput = (utcString: string): string => {
    const utcDate = new Date(utcString);
    const witOffset = 9 * 60; // WIT = UTC+9 in minutes
    const utcMinutes = utcDate.getUTCHours() * 60 + utcDate.getUTCMinutes();
    const witMinutes = utcMinutes + witOffset;
    const witDate = new Date(utcDate);
    witDate.setUTCHours(Math.floor(witMinutes / 60) % 24, witMinutes % 60);
    return witDate.toISOString().slice(0, 16);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    control,
  } = useForm<MovementLogFormData>({
    resolver: zodResolver(movementLogSchema),
    defaultValues: initialData
      ? {
          transaction_id: initialData.transaction_id,
          transaction_date: initialData.transaction_date.split('T')[0],
          trip_id: initialData.trip_id || '',
          document_no: initialData.document_no || '',
          material_id: initialData.material_id || undefined,
          qty: initialData.qty || undefined,
          from_location_id: initialData.from_location_id || undefined,
          to_location_id: initialData.to_location_id || undefined,
          movement_type_id: initialData.movement_type_id || undefined,
          vehicle_driver: initialData.vehicle_driver || '',
          received_by: initialData.received_by || '',
          loading_time: initialData.loading_time
            ? utcToWitInput(initialData.loading_time)
            : '',
          unloading_time: initialData.unloading_time
            ? utcToWitInput(initialData.unloading_time)
            : '',
          condition_notes: initialData.condition_notes || '',
        }
      : {
          transaction_id: generateTransactionId(),
          transaction_date: new Date().toISOString().split('T')[0],
          trip_id: '',
          document_no: '',
          material_id: 0,
          qty: 0,
          from_location_id: 0,
          to_location_id: 0,
          movement_type_id: 0,
          vehicle_driver: '',
          received_by: '',
          loading_time: '',
          unloading_time: '',
          condition_notes: '',
        },
  });

  // Reset form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      reset({
        transaction_id: initialData.transaction_id,
        transaction_date: initialData.transaction_date.split('T')[0],
        trip_id: initialData.trip_id || '',
        document_no: initialData.document_no || '',
        material_id: initialData.material_id || undefined,
        qty: initialData.qty || undefined,
        from_location_id: initialData.from_location_id || undefined,
        to_location_id: initialData.to_location_id || undefined,
        movement_type_id: initialData.movement_type_id || undefined,
        vehicle_driver: initialData.vehicle_driver || '',
        received_by: initialData.received_by || '',
        loading_time: initialData.loading_time
          ? utcToWitInput(initialData.loading_time)
          : '',
        unloading_time: initialData.unloading_time
          ? utcToWitInput(initialData.unloading_time)
          : '',
        condition_notes: initialData.condition_notes || '',
      });
    }
  }, [initialData, reset]);

  useEffect(() => {
    const handleSave = () => handleSubmit(onSubmit)();
    window.addEventListener('save-form', handleSave);
    return () => window.removeEventListener('save-form', handleSave);
  }, [handleSubmit, onSubmit]);

  const { data: materials } = useQuery({
    queryKey: ['materials'],
    queryFn: () => materialApi.getAll().then((res) => res.data.data),
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationApi.getAll().then((res) => res.data.data),
  });

  const { data: movementTypes } = useQuery({
    queryKey: ['movement-types'],
    queryFn: () => movementTypeApi.getAll().then((res) => res.data.data),
  });

  const selectedMaterial = watch('material_id');
  const selectedMaterialData = materials?.find((m: any) => m.id === selectedMaterial);

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm text-gray-900';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';
  const errorClass = 'mt-1 text-xs text-red-600';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Main Fields */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Transaction</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Transaction ID</label>
            <input type="text" {...register('transaction_id')} className={`${inputClass} bg-gray-50`} readOnly={!isEdit} />
            {errors.transaction_id && <p className={errorClass}>{errors.transaction_id.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Date</label>
            <input type="date" {...register('transaction_date')} className={inputClass} />
            {errors.transaction_date && <p className={errorClass}>{errors.transaction_date.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Trip ID</label>
            <input type="text" {...register('trip_id')} className={inputClass} placeholder="Optional" />
          </div>
          <div>
            <label className={labelClass}>Document No</label>
            <input type="text" {...register('document_no')} className={inputClass} placeholder="Optional" />
          </div>
        </div>
      </div>

      {/* Material */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Material</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Material</label>
            <Controller
              name="material_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  items={materials || []}
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
            {errors.material_id && <p className={errorClass}>{errors.material_id.message}</p>}
            {selectedMaterialData && (
              <p className="mt-1.5 text-xs text-gray-500">
                {selectedMaterialData.remarks || '-'} • {selectedMaterialData.unit}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Quantity</label>
            <input type="number" step="0.01" {...register('qty', { valueAsNumber: true })} className={inputClass} placeholder="0.00" />
            {errors.qty && <p className={errorClass}>{errors.qty.message}</p>}
            {selectedMaterialData && <p className="mt-1.5 text-xs text-gray-500">Unit: {selectedMaterialData.unit}</p>}
          </div>
        </div>
      </div>

      {/* Route */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Route</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>From Location</label>
            <Controller
              name="from_location_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  items={locations || []}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <ComboboxInput placeholder="Select from location..." showClear />
                  <ComboboxContent>
                    <ComboboxEmpty>No location found.</ComboboxEmpty>
                    <ComboboxList>
                      {(l: any) => (
                        <ComboboxItem key={l.id} value={l.id}>
                          {l.location_name}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
            />
            {errors.from_location_id && <p className={errorClass}>{errors.from_location_id.message}</p>}
          </div>
          <div>
            <label className={labelClass}>To Location</label>
            <Controller
              name="to_location_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  items={locations || []}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <ComboboxInput placeholder="Select to location..." showClear />
                  <ComboboxContent>
                    <ComboboxEmpty>No location found.</ComboboxEmpty>
                    <ComboboxList>
                      {(l: any) => (
                        <ComboboxItem key={l.id} value={l.id}>
                          {l.location_name}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
            />
            {errors.to_location_id && <p className={errorClass}>{errors.to_location_id.message}</p>}
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Movement Type</label>
            <select {...register('movement_type_id', { valueAsNumber: true })} className={inputClass}>
              <option value={0}>Select...</option>
              {movementTypes?.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {errors.movement_type_id && <p className={errorClass}>{errors.movement_type_id.message}</p>}
          </div>
        </div>
      </div>

      {/* Additional */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Additional</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Driver</label>
            <input type="text" {...register('vehicle_driver')} className={inputClass} placeholder="Optional" />
          </div>
          <div>
            <label className={labelClass}>Received By</label>
            <input type="text" {...register('received_by')} className={inputClass} placeholder="Optional" />
          </div>
          <div>
            <label className={labelClass}>Loading Time</label>
            <input type="datetime-local" {...register('loading_time')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Unloading Time</label>
            <input type="datetime-local" {...register('unloading_time')} className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea {...register('condition_notes')} rows={3} className={inputClass} placeholder="Optional" />
          </div>
        </div>
      </div>
    </form>
  );
}
