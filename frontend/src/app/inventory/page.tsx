'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryNewApi } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Wrench, Package, Search, Calendar, ArrowUpRight, Edit } from 'lucide-react';
import Link from 'next/link';
import InventoryEditModal from '@/components/inventory/InventoryEditModal';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'tools' | 'materials'>('tools');
  const [search, setSearch] = useState('');
  const [editingInventory, setEditingInventory] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch inventory data based on active tab
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', activeTab],
    queryFn: () => {
      if (activeTab === 'tools') {
        return inventoryNewApi.getTools().then((res) => res.data);
      }
      return inventoryNewApi.getMaterials().then((res) => res.data);
    },
  });

  const items = inventoryData?.data || [];

  // Update inventory mutation
  const updateInventoryMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: any }) =>
      inventoryNewApi.update(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', activeTab] });
    },
  });

  const handleUpdateInventory = async (itemId: number, data: any) => {
    await updateInventoryMutation.mutateAsync({ itemId, data });
    setEditingInventory(null);
  };

  // Filter items by search
  const filteredItems = search
    ? items.filter((item: any) =>
        item.list_item?.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase()) ||
        item.spp_number?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600 mt-1">Manage tools and consumables received from SPP requests</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tools</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {activeTab === 'tools' ? filteredItems.length : '-'}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <Wrench className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Consumables</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {activeTab === 'materials' ? filteredItems.length : '-'}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                <Package className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{filteredItems.length}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                <Search className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('tools')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
                    activeTab === 'tools'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                  Tools
                </button>
                <button
                  onClick={() => setActiveTab('materials')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
                    activeTab === 'materials'
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Consumables
                </button>
              </div>

              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by item name, description, or SPP number..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-4 bg-gray-200 rounded w-40 flex-1"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No items found</h3>
                <p className="text-sm text-gray-600">
                  {search
                    ? 'Try adjusting your search'
                    : 'Items will appear here after SITE confirms receipt of SPP requests'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Condition
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                        From SPP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Received Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredItems.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.list_item || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 md:hidden">
                            {item.description?.substring(0, 50)}{item.description && item.description.length > 50 ? '...' : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                          <div className="max-w-xs">
                            <p className="truncate">{item.description || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {item.quantity}
                            <span className="ml-1 text-xs font-normal text-gray-500">{item.unit || 'pcs'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              item.condition_status === 'GOOD'
                                ? 'bg-green-100 text-green-700'
                                : item.condition_status === 'DAMAGED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {item.condition_status === 'GOOD' ? '✓ ' : item.condition_status === 'DAMAGED' ? '✗ ' : '⚠ '}
                            {item.condition_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                          {item.spp_request_id ? (
                            <Link
                              href={`/spp-request/${item.spp_request_id}`}
                              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                              <span className="font-mono">{item.spp_number}</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          ) : (
                            <span className="text-sm font-mono text-gray-600">{item.received_from_spp}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(item.received_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingInventory(item)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit Inventory"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {item.spp_request_id && (
                              <Link
                                href={`/spp-request/${item.spp_request_id}`}
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                              >
                                View
                                <ArrowUpRight className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Edit Inventory Modal */}
        {editingInventory && (
          <InventoryEditModal
            item={editingInventory}
            isOpen={!!editingInventory}
            onClose={() => setEditingInventory(null)}
            onSave={handleUpdateInventory}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
