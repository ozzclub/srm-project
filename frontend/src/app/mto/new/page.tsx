'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mtoApi, materialApi } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { ArrowLeft, Plus, Trash2, Save, X } from 'lucide-react';
import MTOItemsForm from '@/components/mto/MTOItemsForm';

interface MTOFormData {
  mto_number: string;
  project_name: string;
  work_order_no: string;
  request_date: string;
  required_date: string;
  requested_by: string;
  notes: string;
  items: Array<{
    material_id: number | '';
    requested_qty: number;
    notes: string;
  }>;
}

export default function MTONewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<MTOFormData>({
    defaultValues: {
      mto_number: `MTO-${Date.now().toString().slice(-8)}`,
      project_name: '',
      work_order_no: '',
      request_date: new Date().toISOString().split('T')[0],
      required_date: '',
      requested_by: '',
      notes: '',
      items: [{ material_id: '', requested_qty: 0, notes: '' }],
    },
  });

  const itemsFieldArray = useFieldArray({
    control,
    name: 'items',
  });

  // Fetch materials for dropdown
  const { data: materials } = useQuery({
    queryKey: ['materials'],
    queryFn: () => materialApi.getAll().then((res) => res.data.data),
  });

  // Create MTO mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => mtoApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mto-requests'] });
      router.push('/mto');
      router.refresh();
    },
  });

  const onSubmit = async (data: MTOFormData) => {
    // Filter out empty items
    const validItems = data.items.filter(
      (item) => item.material_id && item.requested_qty > 0
    );

    if (validItems.length === 0) {
      alert('Please add at least one item with material and quantity');
      return;
    }

    try {
      setIsSubmitting(true);
      await createMutation.mutateAsync({
        mto_number: data.mto_number,
        project_name: data.project_name,
        work_order_no: data.work_order_no || undefined,
        request_date: data.request_date,
        required_date: data.required_date || undefined,
        requested_by: data.requested_by,
        notes: data.notes || undefined,
        items: validItems.map((item) => ({
          material_id: item.material_id as number,
          requested_qty: item.requested_qty,
          notes: item.notes || undefined,
        })),
      });
    } catch (error: any) {
      console.error('Failed to create MTO:', error);
      alert(error.response?.data?.message || 'Failed to create MTO');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/mto"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New MTO</h1>
            <p className="text-gray-600 mt-1">Fill in the details to create a new Material Take Off request</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* MTO Header Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">MTO Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* MTO Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  MTO Number *
                </label>
                <input
                  type="text"
                  {...register('mto_number', { required: 'MTO number is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
                  placeholder="MTO-XXXXXXXX"
                />
                {errors.mto_number && (
                  <p className="text-red-600 text-xs mt-1">{errors.mto_number.message}</p>
                )}
              </div>

              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  {...register('project_name', { required: 'Project name is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Enter project name"
                />
                {errors.project_name && (
                  <p className="text-red-600 text-xs mt-1">{errors.project_name.message}</p>
                )}
              </div>

              {/* Work Order Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Order No. (optional)
                </label>
                <input
                  type="text"
                  {...register('work_order_no')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
                  placeholder="WO-XXXX"
                />
              </div>

              {/* Requested By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requested By *
                </label>
                <input
                  type="text"
                  {...register('requested_by', { required: 'Requested by is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Person requesting"
                />
                {errors.requested_by && (
                  <p className="text-red-600 text-xs mt-1">{errors.requested_by.message}</p>
                )}
              </div>

              {/* Request Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Request Date *
                </label>
                <input
                  type="date"
                  {...register('request_date', { required: 'Request date is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                {errors.request_date && (
                  <p className="text-red-600 text-xs mt-1">{errors.request_date.message}</p>
                )}
              </div>

              {/* Required Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Required Date (optional)
                </label>
                <input
                  type="date"
                  {...register('required_date')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  placeholder="Additional notes or instructions"
                />
              </div>
            </div>
          </div>

          {/* MTO Items */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <MTOItemsForm
              register={register}
              fieldArray={itemsFieldArray}
              materials={materials || []}
              errors={errors}
              control={control}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <Link
              href="/mto"
              className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <X className="w-4 h-4" />
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || createMutation.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create MTO'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
