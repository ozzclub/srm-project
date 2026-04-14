'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sppApi } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  SPPStatusBadge,
  SPPApprovalTimeline,
  SPPSiteApprovalSection,
  SPPWorkshopDeliverySection,
  SPPItemEditModal
} from '@/components/spp';
import { ArrowLeft, Package, Calendar, User, MapPin, Building2, Edit } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { formatDateLocal } from '@/utils/date';
import type { User as UserType } from '@/types';

export default function SPPDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sppId = parseInt(params.id as string);

  const [activeTab, setActiveTab] = useState<'items' | 'approvals'>('items');
  const [userRole, setUserRole] = useState<string>('');
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Get user role from auth
  useEffect(() => {
    const user = getCurrentUser() as UserType | null;
    if (user) {
      setUserRole(user.role);
    }
  }, []);

  // Fetch SPP detail
  const { data: sppData, isLoading } = useQuery({
    queryKey: ['spp-detail', sppId],
    queryFn: () => sppApi.getById(sppId).then((res) => res.data.data),
  });

  // SITE approve mutation
  const siteApproveMutation = useMutation({
    mutationFn: (data: any) => sppApi.siteApprove(sppId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spp-detail', sppId] });
      queryClient.invalidateQueries({ queryKey: ['spp-requests'] });
    },
  });

  // Workshop delivery update mutation
  const deliveryMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: any }) =>
      sppApi.updateDelivery(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spp-detail', sppId] });
    },
  });

  // SITE verify delivery mutation
  const verifyMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: any }) =>
      sppApi.verifyDelivery(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spp-detail', sppId] });
    },
  });

  // SITE direct receive mutation
  const directReceiveMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: any }) =>
      sppApi.directReceive(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spp-detail', sppId] });
    },
  });

  // SITE update item type mutation
  const itemTypeMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: any }) =>
      sppApi.updateItemType(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spp-detail', sppId] });
    },
  });

  // Update SPP item mutation
  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: any }) =>
      sppApi.updateItem(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spp-detail', sppId] });
    },
  });

  const handleSiteApprove = async (data: any) => {
    await siteApproveMutation.mutateAsync(data);
  };

  const handleUpdateDelivery = async (itemId: number, data: any) => {
    await deliveryMutation.mutateAsync({ itemId, data });
  };

  const handleVerifyDelivery = async (itemId: number, data: any) => {
    await verifyMutation.mutateAsync({ itemId, data });
  };

  const handleDirectReceive = async (itemId: number, data: any) => {
    await directReceiveMutation.mutateAsync({ itemId, data });
  };

  const handleItemTypeChange = async (itemId: number, itemType: 'TOOL' | 'MATERIAL') => {
    await itemTypeMutation.mutateAsync({ itemId, data: { item_type: itemType } });
  };

  const handleUpdateItem = async (itemId: number, data: any) => {
    await updateItemMutation.mutateAsync({ itemId, data });
    setEditingItem(null);
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
  const totalRequested = spp.items?.reduce((sum: any, item: any) => sum + item.request_qty, 0) || 0;
  const totalReceived = spp.items?.reduce((sum: any, item: any) => sum + item.receive_qty, 0) || 0;
  const fulfillmentPercentage = totalRequested > 0 ? (totalReceived / totalRequested) * 100 : 0;

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
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
                  spp.created_by_role === 'site' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {spp.created_by_role === 'site' ? (
                    <><MapPin className="w-3 h-3" /> From SITE</>
                  ) : (
                    <><Building2 className="w-3 h-3" /> From Workshop</>
                  )}
                </span>
              </div>
              <p className="text-gray-600 mt-1">SPP Request Details</p>
            </div>
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

        {/* Role-Based Action Sections */}
        {!userRole ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-gray-600">Loading user role...</p>
          </div>
        ) : userRole === 'site' || userRole === 'material_site' ? (
          <SPPSiteApprovalSection
            spp={spp}
            onSiteApprove={handleSiteApprove}
            onVerifyDelivery={handleVerifyDelivery}
            onDirectReceive={handleDirectReceive}
            onItemTypeChange={handleItemTypeChange}
          />
        ) : userRole === 'workshop' ? (
          <SPPWorkshopDeliverySection
            spp={spp}
            onUpdateDelivery={handleUpdateDelivery}
          />
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              <strong>Note:</strong> Your role ({userRole}) does not have specific actions for this page.
            </p>
          </div>
        )}

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
                Approval History ({spp.approvals?.length || 0})
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">
                        Remarks
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
                        Delivery
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      {(userRole === 'site' || userRole === 'material_site') && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {spp.items?.map((item: any, index: number) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.list_item}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
                          <div className="truncate" title={item.description}>{item.description}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs hidden lg:table-cell">
                          {item.remarks ? (
                            <div className="truncate" title={item.remarks}>{item.remarks}</div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
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
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.delivery_status === 'SENT' || item.delivery_status === 'PENDING_VERIFICATION'
                              ? 'bg-yellow-100 text-yellow-700'
                              : item.delivery_status === 'VERIFIED'
                              ? 'bg-green-100 text-green-700'
                              : item.delivery_status === 'REJECTED'
                              ? 'bg-red-100 text-red-700'
                              : item.delivery_status === 'PARTIAL'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {item.delivery_status === 'SENT' ? 'Sent - Pending Verification' : 
                             item.delivery_status === 'VERIFIED' ? 'Verified' :
                             item.delivery_status === 'REJECTED' ? 'Rejected' :
                             item.delivery_status || 'Not Sent'}
                          </span>
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
                        {(userRole === 'site' || userRole === 'material_site') && (
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setEditingItem(item)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit Item"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </td>
                        )}
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

        {/* Edit Item Modal */}
        {editingItem && (
          <SPPItemEditModal
            item={editingItem}
            isOpen={!!editingItem}
            onClose={() => setEditingItem(null)}
            onSave={handleUpdateItem}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
