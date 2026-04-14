'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sppApi } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { SPPStatusBadge } from '@/components/spp';
import { Truck, Eye, Package, Calendar, MapPin, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDateLocal } from '@/utils/date';

export default function WorkshopDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch SPP requests for workshop
  const { data: sppData, isLoading } = useQuery({
    queryKey: ['spp-requests', search, statusFilter],
    queryFn: () =>
      sppApi
        .getAll({
          page: 1,
          limit: 50,
          search: search || undefined,
          status: statusFilter || undefined,
        })
        .then((res) => res.data),
  });

  const sppRequests = sppData?.data || [];
  const pagination = sppData?.pagination;

  // Filter to show only requests that need workshop action
  const workshopRequests = sppRequests.filter((spp: any) => {
    if (statusFilter) return spp.status === statusFilter;
    return ['PENDING', 'APPROVED', 'IN_TRANSIT'].includes(spp.status);
  });

  const stats = {
    total: sppRequests.length,
    pending: sppRequests.filter((s: any) => s.status === 'PENDING').length,
    inTransit: sppRequests.filter((s: any) => s.status === 'IN_TRANSIT').length,
    completed: sppRequests.filter((s: any) => s.status === 'COMPLETED').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workshop Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage and fulfill material requests from SITE</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <Package className="w-10 h-10 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.pending}</p>
              </div>
              <Calendar className="w-10 h-10 text-orange-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Transit</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.inTransit}</p>
              </div>
              <Truck className="w-10 h-10 text-blue-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.completed}</p>
              </div>
              <Package className="w-10 h-10 text-green-400" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by SPP Number, Requested By, or Notes..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:border-gray-400"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 border rounded-lg transition flex items-center gap-2 ${
                showFilters
                  ? 'bg-blue-50 border-blue-300 text-blue-600'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:border-gray-400"
                  >
                    <option value="">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="IN_TRANSIT">In Transit</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SPP Requests List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Requests to Fulfill ({workshopRequests.length})
            </h2>
          </div>

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
          ) : workshopRequests.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No requests to fulfill</p>
              <p className="text-sm text-gray-500 mt-2">
                New requests from SITE will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {workshopRequests.map((spp: any) => (
                <div key={spp.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link
                          href={`/spp-request/${spp.id}`}
                          className="text-lg font-semibold font-mono text-blue-600 hover:text-blue-700"
                        >
                          {spp.spp_number}
                        </Link>
                        <SPPStatusBadge status={spp.status} />
                        {spp.created_by_role === 'site' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            <MapPin className="w-3 h-3" />
                            From SITE
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Requested By</p>
                          <p className="font-medium text-gray-900">{spp.requested_by}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Request Date</p>
                          <p className="font-medium text-gray-900">{formatDateLocal(spp.request_date)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Items</p>
                          <p className="font-medium text-gray-900">
                            {spp.completed_items || 0} / {spp.total_items || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Fulfillment</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  spp.fulfillment_percentage === 100
                                    ? 'bg-green-500'
                                    : spp.fulfillment_percentage >= 50
                                    ? 'bg-orange-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${spp.fulfillment_percentage || 0}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-700">
                              {spp.fulfillment_percentage?.toFixed(0) || 0}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {spp.notes && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-1">{spp.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/spp-request/${spp.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View & Update</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
