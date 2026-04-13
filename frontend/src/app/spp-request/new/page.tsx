'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sppApi } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { SPPItemsForm } from '@/components/spp';
import { ArrowLeft, Save, Send } from 'lucide-react';
import Link from 'next/link';
import type { CreateSPPItemDTO } from '@/types/spp.types';

export default function NewSPPRequestPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [requestDate, setRequestDate] = useState(
    new Date().toLocaleDateString('en-CA')
  );
  const [requestedBy, setRequestedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<CreateSPPItemDTO[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: any) => sppApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['spp-requests'] });
      const sppId = response.data.data.id;
      router.push(`/spp-request/${sppId}`);
    },
    onError: (error: any) => {
      console.error('Failed to create SPP:', error);
      setErrors({
        submit: error.response?.data?.message || 'Failed to create SPP request',
      });
    },
  });

  const validateForm = (status: 'DRAFT' | 'PENDING'): boolean => {
    const newErrors: Record<string, string> = {};

    if (!requestDate) {
      newErrors.requestDate = 'Request date is required';
    }

    if (!requestedBy.trim()) {
      newErrors.requestedBy = 'Requested by is required';
    }

    if (items.length === 0) {
      newErrors.items = 'At least one item is required';
    } else {
      items.forEach((item, index) => {
        if (!item.list_item?.trim()) {
          newErrors[`item_${index}_list_item`] = 'List Item is required';
        }
        if (!item.description.trim()) {
          newErrors[`item_${index}_description`] = 'Description is required';
        }
        if (!item.unit.trim()) {
          newErrors[`item_${index}_unit`] = 'Unit is required';
        }
        if (!item.request_qty || item.request_qty <= 0) {
          newErrors[`item_${index}_qty`] = 'Valid quantity is required';
        }
        if (!item.date_req) {
          newErrors[`item_${index}_date`] = 'Date is required';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (status: 'DRAFT' | 'PENDING') => {
    if (!validateForm(status)) {
      return;
    }

    const data = {
      request_date: requestDate,
      requested_by: requestedBy,
      notes: notes || undefined,
      status,
      items: items.map((item, index) => ({
        ...item,
        list_item_number: index + 1,
      })),
    };

    createMutation.mutate(data);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/spp-request"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New SPP Request</h1>
            <p className="text-gray-600 mt-1">Create a new item request</p>
          </div>
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {errors.submit}
          </div>
        )}

        {/* Form */}
        <form className="space-y-6">
          {/* Header Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Request Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                    errors.requestDate ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                  }`}
                />
                {errors.requestDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.requestDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requested By <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  placeholder="Enter your name or team"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                    errors.requestedBy ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                  }`}
                />
                {errors.requestedBy && (
                  <p className="text-red-500 text-xs mt-1">{errors.requestedBy}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes or instructions..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:border-gray-400 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <SPPItemsForm
              items={items}
              onChange={setItems}
              mode="create"
            />
            {errors.items && (
              <p className="text-red-500 text-sm mt-3">{errors.items}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/spp-request"
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => handleSubmit('DRAFT')}
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>Save Draft</span>
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('PENDING')}
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>{createMutation.isPending ? 'Submitting...' : 'Submit Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
