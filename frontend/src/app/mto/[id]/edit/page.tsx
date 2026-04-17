'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mtoApi, materialApi } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { ArrowLeft, Plus, Trash2, Save, X, AlertTriangle } from 'lucide-react';
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
    id?: number;
    material_id: number | '';
    requested_qty: number;
    notes: string;
  }>;
}

export default function MTOEditPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const mtoId = parseInt(params.id as string);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNotDraft, setIsNotDraft] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MTOFormData>();

  const itemsFieldArray = useFieldArray({
    control,
    name: 'items',
  });

  // Fetch MTO details
  const { data: mtoData, isLoading: mtoLoading } = useQuery({
    queryKey: ['mto-detail', mtoId],
    queryFn: () => mtoApi.getById(mtoId).then((res) => res.data.data),
    enabled: !isNaN(mtoId),
  });

  // Fetch materials for dropdown
  const { data: materials } = useQuery({
    queryKey: ['materials'],
    queryFn: () => materialApi.getAll().then((res) => res.data.data),
  });

  // Update MTO mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => mtoApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mto-detail', mtoId] });
      queryClient.invalidateQueries({ queryKey: ['mto-requests'] });
      router.push(`/mto/${mtoId}`);
      router.refresh();
    },
  });

  // Pre-fill form when data is loaded
  useEffect(() => {
    if (mtoData) {
      reset({
        mto_number: mtoData.mto_number,
        project_name: mtoData.project_name,
        work_order_no: mtoData.work_order_no || '',
        request_date: mtoData.request_date,
        required_date: mtoData.required_date || '',
        requested_by: mtoData.requested_by,
        notes: mtoData.notes || '',
        items: mtoData.items && mtoData.items.length > 0 
          ? mtoData.items.map((item: any) => ({
              id: item.id,
              material_id: item.material_id,
              requested_qty: item.requested_qty,
              notes: item.notes || '',
            }))
          : [{ material_id: '', requested_qty: 0, notes: '' }],
      });

      setIsNotDraft(mtoData.status !== 'DRAFT');
    }
  }, [mtoData, reset]);

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
      await updateMutation.mutateAsync({
        id: mtoId,
        data: {
          project_name: data.project_name,
          work_order_no: data.work_order_no || undefined,
          request_date: data.request_date,
          required_date: data.required_date || undefined,
          requested_by: data.requested_by,
          notes: data.notes || undefined,
        },
      });

      // Note: Items update would need separate API calls
      // For now, we only update the header info
    } catch (error: any) {
      console.error('Failed to update MTO:', error);
      alert(error.response?.data?.message || 'Failed to update MTO');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (mtoLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href={`/mto/${mtoId}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit MTO</h1>
            <p className="text-gray-600 mt-1">Update MTO request information</p>
          </div>
        </div>

        {/* Warning if not DRAFT */}
        {isNotDraft && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-900">Warning: MTO is not in DRAFT status</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Editing is only recommended for MTOs in DRAFT status. Changes to approved or active MTOs may affect tracking.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* MTO Header Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">MTO Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* MTO Number (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  MTO Number
                </label>
                <input
                  type="text"
                  {...register('mto_number')}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 font-mono cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Cannot be changed after creation</p>
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

          {/* MTO Items (View Only for now) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">MTO Items</h2>
              <p className="text-sm text-gray-500">Items cannot be modified after creation</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
              <p>MTO items are locked after creation. Contact administrator to add or remove items.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <Link
              href={`/mto/${mtoId}`}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <X className="w-4 h-4" />
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || updateMutation.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSubmitting || updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
