'use client';

import { useQuery } from '@tanstack/react-query';
import { movementLogApi } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Truck,
  Calendar,
  MapPin,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jayapura',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function TripDetail() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const [copied, setCopied] = useState(false);

  const { data: tripData, isLoading, error, refetch } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => movementLogApi.getByTripId(tripId).then((res) => res.data.data),
    enabled: !!tripId,
  });

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(tripId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto py-8 animate-pulse space-y-6">
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error
  if (error || !tripData) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-medium text-gray-900 mb-1">
            {error ? 'Failed to Load' : 'Not Found'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {error ? 'Unable to fetch trip details' : 'Trip does not exist'}
          </p>
          <div className="flex gap-2 justify-center">
            {error && (
              <button onClick={() => refetch()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
                <RefreshCw className="w-4 h-4 inline mr-1" /> Retry
              </button>
            )}
            <button onClick={() => router.push('/movement-log')} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm">
              Back
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate totals
  const totalQty = tripData.reduce((sum: number, item: any) => sum + (parseFloat(item.qty) || 0), 0);
  const uniqueMaterials = [...new Set(tripData.map((item: any) => item.material_id))];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 py-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/movement-log')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* Trip Header */}
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Truck className="w-6 h-6 text-blue-600" />
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500 font-mono">{tripId}</p>
              <button onClick={copyId} className="p-1 hover:bg-gray-100 rounded transition">
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
              </button>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Trip Details</h1>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Package className="w-5 h-5 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{tripData.length}</p>
              <p className="text-xs text-gray-500">Transactions</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Package className="w-5 h-5 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{uniqueMaterials.length}</p>
              <p className="text-xs text-gray-500">Materials</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Calendar className="w-5 h-5 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-900">
                {formatDate(tripData[0]?.transaction_date)}
              </p>
              <p className="text-xs text-gray-500">Date</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <MapPin className="w-5 h-5 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{totalQty}</p>
              <p className="text-xs text-gray-500">Total Qty</p>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Materials in this Trip</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    From
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Document No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Driver
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tripData.map((log: any) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/transaction/${log.transaction_id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-700">
                      {log.transaction_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.material?.material_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                      {log.from_location?.location_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                      {log.to_location?.location_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.qty || '-'} {log.material?.unit || ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                      {log.document_no ? (
                        <Link
                          href={`/do-number/${log.document_no}`}
                          className="text-blue-600 hover:text-blue-700 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {log.document_no}
                        </Link>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                      {log.vehicle_driver || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Showing {tripData.length} transaction(s) for this trip
        </p>
      </div>
    </DashboardLayout>
  );
}

export default TripDetail;
