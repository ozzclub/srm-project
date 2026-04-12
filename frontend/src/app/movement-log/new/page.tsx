'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { movementLogApi } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MovementLogForm from '@/components/forms/MovementLogForm';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function CreateMovementLogPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => movementLogApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movement-logs'] });
      router.push('/movement-log');
    },
  });

  const handleSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/movement-log"
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Create Movement Log
            </h1>
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('save-form'))}
            disabled={createMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {createMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <MovementLogForm
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
