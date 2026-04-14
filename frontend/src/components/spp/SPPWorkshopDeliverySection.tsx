'use client';

import { useState } from 'react';
import { Truck, Loader2 } from 'lucide-react';
import type { SPPRequestWithItems } from '@/types/spp.types';

interface SPPWorkshopDeliverySectionProps {
  spp: SPPRequestWithItems;
  onUpdateDelivery: (itemId: number, data: {
    receive_qty?: number;
    delivery_status?: 'NOT_SENT' | 'SENT';
    item_status?: 'PENDING' | 'IN_TRANSIT' | 'PENDING_VERIFICATION';
  }) => Promise<void>;
}

export default function SPPWorkshopDeliverySection({
  spp,
  onUpdateDelivery,
}: SPPWorkshopDeliverySectionProps) {
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [deliveryQtys, setDeliveryQtys] = useState<Record<number, number>>(
    spp.items.reduce((acc, item) => ({ ...acc, [item.id]: item.receive_qty }), {})
  );

  const handleQtyChange = (itemId: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    setDeliveryQtys((prev) => ({ ...prev, [itemId]: Math.max(0, numValue) }));
  };

  const handleUpdateDelivery = async (item: SPPRequestWithItems['items'][0]) => {
    setUpdatingItemId(item.id);
    try {
      await onUpdateDelivery(item.id, {
        receive_qty: deliveryQtys[item.id] || 0,
      });
    } catch (error) {
      console.error('Failed to update delivery:', error);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const getDeliveryStatusBadge = (item: SPPRequestWithItems['items'][0]) => {
    const status = item.delivery_status || 'NOT_SENT';
    const styles: Record<string, string> = {
      NOT_SENT: 'bg-gray-100 text-gray-700',
      SENT: 'bg-blue-100 text-blue-700',
      VERIFIED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      NOT_SENT: 'Not Sent',
      SENT: 'Sent',
      VERIFIED: 'Verified',
      REJECTED: 'Rejected',
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Workshop Delivery Tracking
          </h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Update delivery quantities and track fulfillment status per item.
        </p>
      </div>

      {/* Items with Delivery Update */}
      <div className="divide-y divide-gray-200">
        {spp.items.map((item) => {
          const isUpdating = updatingItemId === item.id;
          const canUpdate = spp.status !== 'COMPLETED' && spp.status !== 'CANCELLED';

          return (
            <div key={item.id} className="p-4 hover:bg-gray-50 transition">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">
                      {item.list_item || `Item ${item.list_item_number}`}
                    </p>
                    {getDeliveryStatusBadge(item)}
                    {item.request_status === 'FULFILLED' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        ✓ Fulfilled
                      </span>
                    )}
                    {item.delivery_status === 'SENT' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                        ⏳ Pending Verification
                      </span>
                    )}
                    {item.delivery_status === 'REJECTED' && item.rejection_reason && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700" title={item.rejection_reason}>
                        ❌ Rejected
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{item.description}</p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    <span>Requested: <strong>{item.request_qty} {item.unit}</strong></span>
                    <span>Delivered: <strong>{item.receive_qty} {item.unit}</strong></span>
                    <span>Remaining: <strong>{item.remaining_qty} {item.unit}</strong></span>
                  </div>
                </div>
                
                {canUpdate && item.request_status !== 'FULFILLED' && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Deliver:</label>
                    <input
                      type="number"
                      value={deliveryQtys[item.id] || 0}
                      onChange={(e) => handleQtyChange(item.id, e.target.value)}
                      min="0"
                      max={item.remaining_qty}
                      step="0.01"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Qty"
                    />
                    <span className="text-sm text-gray-600">{item.unit}</span>
                    <button
                      onClick={() => handleUpdateDelivery(item)}
                      disabled={isUpdating || deliveryQtys[item.id] <= 0}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Update (Pending Verification)'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
