'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mtoApi } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import MTOStatusBadge from '@/components/mto/MTOStatusBadge';
import MTOCard from '@/components/mto/MTOCard';
import MTOFulfillmentBar from '@/components/mto/MTOFulfillmentBar';

export default function MTODetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const mtoId = parseInt(params.id as string);

  // Fetch MTO details
  const { data: mtoData, isLoading } = useQuery({
    queryKey: ['mto-detail', mtoId],
    queryFn: () => mtoApi.getById(mtoId).then((res) => res.data.data),
    enabled: !isNaN(mtoId),
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      mtoApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mto-detail', mtoId] });
      queryClient.invalidateQueries({ queryKey: ['mto-requests'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => mtoApi.delete(id),
    onSuccess: () => {
      router.push('/mto');
      router.refresh();
    },
  });

  const handleApprove = async () => {
    if (confirm('Approve this MTO request?')) {
      await updateStatusMutation.mutateAsync({ id: mtoId, status: 'APPROVED' });
    }
  };

  const handleCancel = async () => {
    if (confirm('Cancel this MTO request? This action cannot be undone.')) {
      await updateStatusMutation.mutateAsync({ id: mtoId, status: 'CANCELLED' });
    }
  };

  const handleDelete = async () => {
    if (confirm('Delete this MTO request permanently?')) {
      await deleteMutation.mutateAsync(mtoId);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!mtoData) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">MTO Not Found</h2>
          <p className="text-gray-600 mb-6">The MTO request you're looking for doesn't exist.</p>
          <Link
            href="/mto"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to MTO List
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const mto = mtoData;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/mto"
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MTO Details</h1>
              <p className="text-gray-600 mt-1">View and manage MTO request</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {mto.status === 'DRAFT' && (
              <>
                <Link
                  href={`/mto/${mto.id}/edit`}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Link>
                <button
                  onClick={handleApprove}
                  disabled={updateStatusMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={handleCancel}
                  disabled={updateStatusMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* MTO Card */}
        <MTOCard
          mtoNumber={mto.mto_number}
          projectName={mto.project_name}
          workOrderNo={mto.work_order_no}
          requestDate={mto.request_date}
          requiredDate={mto.required_date}
          requestedBy={mto.requested_by}
          approvedBy={mto.approved_by}
          status={mto.status}
          notes={mto.notes}
          totalItems={mto.total_items}
          completedItems={mto.completed_items}
          fulfillmentPercentage={mto.fulfillment_percentage}
        />

        {/* Items Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">MTO Items</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Specification
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fulfilled
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remaining
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Progress
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mto.items && mto.items.length > 0 ? (
                  mto.items.map((item: any) => {
                    const remaining = Math.max(0, item.requested_qty - item.fulfilled_qty);
                    const itemPercentage =
                      item.requested_qty > 0
                        ? (item.fulfilled_qty / item.requested_qty) * 100
                        : 0;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {item.material?.description || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono hidden md:table-cell">
                          {item.material?.material_code || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                          {item.material?.specification || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          {item.requested_qty}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-600 text-right font-medium">
                          {item.fulfilled_qty}
                        </td>
                        <td className="px-4 py-3 text-sm text-red-600 text-right font-medium">
                          {remaining}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {item.unit}
                        </td>
                        <td className="px-4 py-3 text-sm hidden md:table-cell">
                          <div className="w-32">
                            <MTOFulfillmentBar
                              requestedQty={item.requested_qty}
                              fulfilledQty={item.fulfilled_qty}
                              unit={item.unit}
                              showLabel={false}
                              size="sm"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {itemPercentage === 0 ? (
                            <AlertCircle className="w-5 h-5 text-gray-400 mx-auto" />
                          ) : itemPercentage < 100 ? (
                            <AlertCircle className="w-5 h-5 text-orange-500 mx-auto" />
                          ) : (
                            <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No items in this MTO
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes */}
        {mto.notes && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{mto.notes}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-xs text-gray-500">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-gray-400">Created At</div>
              <div className="font-medium text-gray-700">
                {format(new Date(mto.created_at), 'MMM dd, yyyy HH:mm')}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Updated At</div>
              <div className="font-medium text-gray-700">
                {format(new Date(mto.updated_at), 'MMM dd, yyyy HH:mm')}
              </div>
            </div>
            <div>
              <div className="text-gray-400">MTO ID</div>
              <div className="font-medium text-gray-700 font-mono">{mto.id}</div>
            </div>
            <div>
              <div className="text-gray-400">Created By</div>
              <div className="font-medium text-gray-700">
                {mto.created_by ? `User #${mto.created_by}` : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
