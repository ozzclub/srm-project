'use client';

import { useState, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mtoApi } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  Eye,
  Trash2,
} from 'lucide-react';
import MTOStatusBadge from '@/components/mto/MTOStatusBadge';
import { format } from 'date-fns';

function MTOList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');

  // Fetch MTO requests
  const { data: mtoData, isLoading } = useQuery({
    queryKey: ['mto-requests', page, limit, search, status, dateFrom, dateTo],
    queryFn: () =>
      mtoApi
        .getAll({
          page,
          limit,
          search: search || undefined,
          status: status || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        })
        .then((res) => res.data),
  });

  const mtoRequests = mtoData?.data || [];
  const pagination = mtoData?.pagination;

  // Delete MTO mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => mtoApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mto-requests'] });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ['mto-requests'] });
  };

  const clearFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setStatus('');
    setPage(1);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this MTO request?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete MTO:', error);
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Material Take Off</h1>
            <p className="text-gray-600 mt-1">Manage MTO requests and track fulfillment</p>
          </div>
          <Link
            href="/mto/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>New MTO</span>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by MTO Number, Project, or Requested By..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:border-gray-400"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium active:scale-95 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2.5 border rounded-lg transition flex items-center gap-2 focus:ring-2 focus:ring-gray-500 ${
                  showFilters
                    ? 'bg-blue-50 border-blue-300 text-blue-600'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-5 h-5" />
                Filters
              </button>
            </div>
          </form>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="border-t border-gray-200 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:border-gray-400"
                >
                  <option value="">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div className="md:col-span-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2.5 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition focus:ring-2 focus:ring-gray-500"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-4 bg-gray-200 rounded w-40 flex-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        MTO Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Request Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Requested By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Fulfillment
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mtoRequests.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-6 py-8 text-center text-gray-600"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="w-12 h-12 text-gray-400" />
                            <p>No MTO requests found</p>
                            <Link
                              href="/mto/new"
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Create your first MTO →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      mtoRequests.map((mto: any) => (
                        <tr
                          key={mto.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-700">
                            <Link
                              href={`/mto/${mto.id}`}
                              className="hover:underline font-mono"
                            >
                              {mto.mto_number}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {mto.project_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                            {format(new Date(mto.request_date), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                            {mto.requested_by}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <MTOStatusBadge status={mto.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                            {mto.completed_items || 0} / {mto.total_items || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm hidden lg:table-cell">
                            <div className="w-32">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    mto.fulfillment_percentage === 100
                                      ? 'bg-green-500'
                                      : mto.fulfillment_percentage >= 50
                                      ? 'bg-orange-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${mto.fulfillment_percentage || 0}%` }}
                                />
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {mto.fulfillment_percentage?.toFixed(1) || 0}%
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/mto/${mto.id}`}
                                className="text-blue-600 hover:text-blue-700"
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => handleDelete(mto.id)}
                                className="text-red-600 hover:text-red-700"
                                title="Delete"
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-gray-700">
                    Showing{' '}
                    <span className="font-medium">
                      {(pagination.page - 1) * pagination.limit + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium">
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total
                      )}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium">{pagination.total}</span>{' '}
                    results
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!pagination.hasPrev}
                      className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition focus:ring-2 focus:ring-gray-500 active:scale-95"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                      disabled={!pagination.hasNext}
                      className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition focus:ring-2 focus:ring-gray-500 active:scale-95"
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function MTOListPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <MTOList />
    </Suspense>
  );
}
