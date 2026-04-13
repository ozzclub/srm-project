'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sppApi } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { SPPStatusBadge, SPPApprovalTimeline, SPPApprovalSection } from '@/components/spp';
import { ArrowLeft, Edit2, Trash2, Package, Calendar, User, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { formatDateLocal } from '@/utils/date';

export default function SPPDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sppId = parseInt(params.id as string);

  const [activeTab, setActiveTab] = useState<'items' | 'approvals'>('items');

  // Fetch SPP detail
  const { data: sppData, isLoading } = useQuery({
    queryKey: ['spp-detail', sppId],
    queryFn: () => sppApi.getById(sppId).then((res) => res.data.data),
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (data: any) => sppApi.approve(sppId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spp-detail', sppId] });
      queryClient.invalidateQueries({ queryKey: ['spp-requests'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => sppApi.delete(sppId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spp-requests'] });
      router.push('/spp-request');
    },
  });

  // Update receive qty mutation
  const receiveMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: any }) =>
      sppApi.receiveItem(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spp-detail', sppId] });
    },
  });

  const handleApprove = async (data: any) => {
    await approveMutation.mutateAsync(data);
  };

  const handleUpdateReceive = async (itemId: number, receiveQty: number) => {
    await receiveMutation.mutateAsync({
      itemId,
      data: {
        receive_qty: receiveQty,
        item_status: receiveQty > 0 ? 'IN_TRANSIT' : 'PENDING',
      },
    });
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this SPP request?')) {
      await deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!sppData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">SPP request not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const spp = sppData;
  const totalRequested = spp.items?.reduce((sum: number, item: any) => sum + item.request_qty, 0) || 0;
  const totalReceived = spp.items?.reduce((sum: number, item: any) => sum + item.receive_qty, 0) || 0;
  const fulfillmentPercentage = totalRequested > 0 ? (totalReceived / totalRequested) * 100 : 0;

  // Mock user role - replace with actual user role from auth
  const userRole = 'material_site'; // This should come from your auth system

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/spp-request"
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 font-mono">{spp.spp_number}</h1>
                <SPPStatusBadge status={spp.status} />
              </div>
              <p className="text-gray-600 mt-1">SPP Request Details</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {spp.status === 'DRAFT' && (
              <>
                <Link
                  href={`/spp-request/${spp.id}/edit`}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit</span>
                </Link>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Request Date</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {formatDateLocal(spp.request_date, 'long')}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Requested By</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{spp.requested_by}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Total Items</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {spp.total_items || spp.items?.length || 0} items
            </p>
          </div>
        </div>

        {/* Notes */}
        {spp.notes && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-1">Notes</h4>
            <p className="text-blue-800">{spp.notes}</p>
          </div>
        )}

        {/* Fulfillment Progress */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fulfillment Progress</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Overall Progress</span>
              <span className="font-semibold text-gray-900">
                {fulfillmentPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  fulfillmentPercentage === 100
                    ? 'bg-green-500'
                    : fulfillmentPercentage >= 50
                    ? 'bg-orange-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${fulfillmentPercentage}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{totalRequested.toFixed(2)}</p>
                <p className="text-xs text-gray-600 mt-1">Total Requested</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{totalReceived.toFixed(2)}</p>
                <p className="text-xs text-gray-600 mt-1">Total Received</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {(totalRequested - totalReceived).toFixed(2)}
                </p>
                <p className="text-xs text-gray-600 mt-1">Remaining</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('items')}
                className={`py-4 px-6 border-b-2 font-medium text-sm transition ${
                  activeTab === 'items'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Items ({spp.items?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className={`py-4 px-6 border-b-2 font-medium text-sm transition ${
                  activeTab === 'approvals'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Approval History
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Items Tab */}
            {activeTab === 'items' && (
              <div className="overflow-x-auto">
                <table className="w-full">
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Unit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Request
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Received
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Remaining
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {spp.items?.map((item: any, index: number) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.list_item}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.unit}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {item.request_qty}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-green-600">
                          {item.receive_qty}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-orange-600">
                          {item.remaining_qty}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.request_status === 'FULFILLED'
                                ? 'bg-green-100 text-green-800'
                                : item.request_status === 'PARTIAL'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {item.request_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Approvals Tab */}
            {activeTab === 'approvals' && (
              <SPPApprovalTimeline approvals={spp.approvals || []} />
            )}
          </div>
        </div>

        {/* Approval Section (Role-based) */}
        <SPPApprovalSection
          spp={spp}
          userRole={userRole}
          onApprove={handleApprove}
          onUpdateReceive={handleUpdateReceive}
        />
      </div>
    </DashboardLayout>
  );
}
