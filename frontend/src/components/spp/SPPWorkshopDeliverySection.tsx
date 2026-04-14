'use client';

import { useState } from 'react';
import { Truck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { SPPRequestWithItems, SPPItem } from '@/types/spp.types';
import RejectionReasonPopup from './RejectionReasonPopup';

interface SPPWorkshopDeliverySectionProps {
  spp: SPPRequestWithItems;
  onUpdateDelivery: (itemId: number, data: {
    receive_qty?: number;
    delivery_status?: 'NOT_SENT' | 'SENT';
    item_status?: 'PENDING' | 'IN_TRANSIT' | 'PENDING_VERIFICATION';
  }) => Promise<void>;
  onVerifyReturn?: (itemId: number, data: { actual_qty?: number; notes?: string }) => Promise<void>;
}

export default function SPPWorkshopDeliverySection({
  spp,
  onUpdateDelivery,
  onVerifyReturn,
}: SPPWorkshopDeliverySectionProps) {
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [deliveryQtys, setDeliveryQtys] = useState<Record<number, number>>(
    spp.items.reduce((acc, item) => ({ ...acc, [item.id]: 0 }), {}) // Initialize with 0 to clear form
  );
  const [selectedRejectionItem, setSelectedRejectionItem] = useState<SPPRequestWithItems['items'][0] | null>(null);
  const [confirmingItem, setConfirmingItem] = useState<SPPItem | null>(null);
  
  // Return states
  const [isVerifyingReturn, setIsVerifyingReturn] = useState<number | null>(null);

  const handleQtyChange = (itemId: number, value: string) => {
    const numValue = parseFloat(value) || 0;

    // Allow workshop to input more than remaining_qty (surplus will be handled by site return workflow)
    const finalValue = Math.max(0, numValue);

    setDeliveryQtys((prev) => ({ ...prev, [itemId]: finalValue }));
  };

  const initiateUpdate = (item: SPPItem) => {
    const qty = deliveryQtys[item.id] || 0;
    if (qty <= 0) return;
    setConfirmingItem(item);
  };

  const handleUpdateDelivery = async () => {
    if (!confirmingItem) return;
    
    const itemId = confirmingItem.id;
    const qtyToDeliver = deliveryQtys[itemId] || 0;
    
    setUpdatingItemId(itemId);
    setConfirmingItem(null);
    
    try {
      // Backend updateItemDelivery adds this amount to existing receive_qty or sets it?
      // Based on spp.service.ts implementation: it takes receive_qty as the NEW value.
      const newTotalReceive = (confirmingItem.receive_qty || 0) + qtyToDeliver;

      await onUpdateDelivery(itemId, {
        receive_qty: newTotalReceive,
        delivery_status: 'SENT',
        item_status: 'PENDING_VERIFICATION'
      });

      // Reset form for this item
      setDeliveryQtys(prev => ({ ...prev, [itemId]: 0 }));
      
    } catch (error) {
      console.error('Failed to update delivery:', error);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleVerifyReturn = async (itemId: number) => {
    if (!onVerifyReturn) return;

    setIsVerifyingReturn(itemId);
    try {
      await onVerifyReturn(itemId, {});
    } catch (error) {
      console.error('Failed to verify return:', error);
      alert('Gagal memverifikasi penerimaan pengembalian');
    } finally {
      setIsVerifyingReturn(null);
    }
  };

  const getDeliveryStatusBadge = (item: SPPRequestWithItems['items'][0]) => {
    const status = item.delivery_status || 'NOT_SENT';
    const styles: Record<string, string> = {
      NOT_SENT: 'bg-gray-100 text-gray-700',
      SENT: 'bg-blue-100 text-blue-700',
      VERIFIED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
      PENDING_VERIFICATION: 'bg-yellow-100 text-yellow-700',
      PARTIAL: 'bg-yellow-100 text-yellow-700',
    };
    const labels: Record<string, string> = {
      NOT_SENT: 'Not Sent',
      SENT: 'Sent',
      VERIFIED: 'Verified',
      REJECTED: 'Rejected',
      PENDING_VERIFICATION: 'Pending Verification',
      PARTIAL: 'Partial Delivery',
    };

    const currentStatus = (item.item_status === 'PENDING_VERIFICATION' || item.delivery_status === 'SENT') 
      ? 'PENDING_VERIFICATION' 
      : status;

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[currentStatus] || styles.NOT_SENT}`}>
        {labels[currentStatus] || labels.NOT_SENT}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* SECTION: Incoming Returns from Site */}
      {spp.items.some(item => item.return_status === 'RETURNING') && (
        <div className="bg-orange-50 border-b border-orange-200">
          <div className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Truck className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-orange-900 uppercase tracking-wider">
                Pengembalian Masuk dari Site
              </h3>
              <p className="text-xs text-orange-700">
                Ada barang yang dikembalikan oleh Site. Mohon konfirmasi penerimaan fisik.
              </p>
            </div>
          </div>
          <div className="divide-y divide-orange-100 border-t border-orange-100">
            {spp.items.filter(item => item.return_status === 'RETURNING').map(item => (
              <div key={`return-${item.id}`} className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-gray-900">{item.list_item || item.description}</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-200 text-orange-800">
                      {item.return_type === 'REPLACEMENT' ? 'Minta Ganti' : 'Selesai Pakai'}
                    </span>
                  </div>
                  <p className="text-xs text-orange-800">
                    Jumlah Kembali: <span className="font-bold">{item.return_qty} {item.unit}</span>
                  </p>
                </div>
                <button
                  onClick={() => handleVerifyReturn(item.id)}
                  disabled={isVerifyingReturn === item.id}
                  className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isVerifyingReturn === item.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>Konfirmasi Terima</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-6 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Truck className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Workshop Delivery Tracking
              </h3>
              <p className="text-sm text-gray-500">
                Update delivery quantities and track fulfillment status per item.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Items with Delivery Update */}
      <div className="divide-y divide-gray-200">
        {(() => {
          const itemsToTrack = spp.items.filter(item => item.request_status !== 'FULFILLED');
          
          if (itemsToTrack.length === 0) {
            return (
              <div className="p-12 text-center bg-gray-50/30">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4 shadow-sm shadow-green-100">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Pengiriman Selesai</h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                  Semua barang dalam SPP ini telah terkirim sepenuhnya (100%).
                </p>
              </div>
            );
          }

          return itemsToTrack.map((item) => {
            const isUpdating = updatingItemId === item.id;
            // canUpdate should allow action if status is not cancelled AND (item has remaining qty OR status is not completed)
            const canUpdate = spp.status !== 'CANCELLED' && (item.remaining_qty > 0 || spp.status !== 'COMPLETED');
            const qtyInput = deliveryQtys[item.id] || 0;

            return (
              <div key={item.id} className="p-5 hover:bg-gray-50/80 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-mono font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        #{item.list_item_number}
                      </span>
                      <p className="font-bold text-gray-900 truncate">
                        {item.list_item || item.description}
                      </p>
                      {getDeliveryStatusBadge(item)}
                    </div>
                    
                    {item.list_item && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-1">{item.description}</p>
                    )}

                    <div className="grid grid-cols-3 gap-2 max-w-sm">
                      <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Requested</p>
                        <p className="text-sm font-bold text-gray-700">{item.request_qty} <span className="text-[10px] font-normal">{item.unit}</span></p>
                      </div>
                      <div className="px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-[10px] uppercase font-bold text-blue-400 mb-0.5">Delivered</p>
                        <p className="text-sm font-bold text-blue-700">{item.receive_qty} <span className="text-[10px] font-normal">{item.unit}</span></p>
                      </div>
                      <div className="px-3 py-2 bg-orange-50 rounded-lg border border-orange-100">
                        <p className="text-[10px] uppercase font-bold text-orange-400 mb-0.5">Remaining</p>
                        <p className="text-sm font-bold text-orange-700">{item.remaining_qty} <span className="text-[10px] font-normal">{item.unit}</span></p>
                      </div>
                    </div>
                  </div>
                  
                  {canUpdate && item.remaining_qty > 0 && (
                    <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <div className="relative">
                        <input
                          type="number"
                          value={qtyInput || ''}
                          onChange={(e) => handleQtyChange(item.id, e.target.value)}
                          min="0"
                          step="0.01"
                          className={`w-28 pl-3 pr-10 py-2.5 bg-white border rounded-lg focus:ring-2 focus:outline-none text-sm font-bold text-gray-900 transition-all ${
                            qtyInput > item.remaining_qty
                              ? 'border-orange-400 ring-2 ring-orange-200 focus:ring-orange-400'
                              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                          }`}
                          placeholder="0.00"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">
                          {item.unit}
                        </span>
                      </div>

                      {qtyInput > item.remaining_qty && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-md">
                          <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
                          <span className="text-[10px] font-bold text-orange-700 uppercase">Surplus</span>
                        </div>
                      )}

                      <button
                        onClick={() => initiateUpdate(item)}
                        disabled={isUpdating || qtyInput <= 0}
                        className="whitespace-nowrap px-5 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 active:scale-95 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-sm shadow-blue-200 flex items-center gap-2"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>Update Delivery</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* Custom Confirmation Dialog */}
      {confirmingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4 text-blue-600">
                <div className="p-2 bg-blue-50 rounded-full">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">Confirm Delivery</h3>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Item Details</p>
                  <p className="font-bold text-gray-900">{confirmingItem.list_item || confirmingItem.description}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{confirmingItem.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Requested Total</p>
                    <p className="text-lg font-bold text-gray-900">{confirmingItem.request_qty} <span className="text-xs font-normal text-gray-500">{confirmingItem.unit}</span></p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Delivered (Previous)</p>
                    <p className="text-lg font-bold text-blue-700">{confirmingItem.receive_qty || 0} <span className="text-xs font-normal text-blue-500">{confirmingItem.unit}</span></p>
                  </div>
                  <div className={`p-3 rounded-xl text-white ${
                    (deliveryQtys[confirmingItem.id] || 0) > confirmingItem.remaining_qty
                      ? 'bg-orange-600'
                      : 'bg-blue-600'
                  }`}>
                    <p className="text-[10px] font-bold uppercase mb-1 opacity-80">
                      {(deliveryQtys[confirmingItem.id] || 0) > confirmingItem.remaining_qty ? 'Delivering Now (Surplus)' : 'Delivering Now'}
                    </p>
                    <p className="text-lg font-bold">{deliveryQtys[confirmingItem.id]} <span className="text-xs font-normal opacity-80">{confirmingItem.unit}</span></p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                    <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Total After Update</p>
                    <p className="text-lg font-bold text-green-700">{((confirmingItem.receive_qty || 0) + (deliveryQtys[confirmingItem.id] || 0)).toFixed(2)} <span className="text-xs font-normal text-green-500">{confirmingItem.unit}</span></p>
                  </div>
                </div>

                {(deliveryQtys[confirmingItem.id] || 0) > confirmingItem.request_qty && (
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <span className="text-xs font-bold text-orange-600 uppercase">Surplus Quantity</span>
                    </div>
                    <span className="font-bold text-orange-700">
                      +{((deliveryQtys[confirmingItem.id] || 0) - confirmingItem.request_qty).toFixed(2)} {confirmingItem.unit}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-xs font-bold text-gray-400 uppercase">Remaining After Update</span>
                  <span className={`font-bold ${(confirmingItem.remaining_qty - (deliveryQtys[confirmingItem.id] || 0)) < 0 ? 'text-orange-700' : 'text-orange-700'}`}>
                    {(confirmingItem.remaining_qty - (deliveryQtys[confirmingItem.id] || 0)).toFixed(2)} {confirmingItem.unit}
                  </span>
                </div>

                {(deliveryQtys[confirmingItem.id] || 0) > confirmingItem.request_qty && (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700 leading-tight">
                      <strong>Surplus Delivery:</strong> Site dapat mengembalikan kelebihan barang melalui fitur "Selesai Pakai" (SURPLUS return workflow).
                    </p>
                  </div>
                )}

                <p className="text-sm text-gray-500 text-center px-2 italic">
                  "By confirming, this quantity will be marked as sent and will await verification from the Site."
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setConfirmingItem(null)}
                className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 active:scale-95 transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateDelivery}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all text-sm shadow-lg shadow-blue-200"
              >
                Yes, Update Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      <RejectionReasonPopup
        isOpen={!!selectedRejectionItem}
        onClose={() => setSelectedRejectionItem(null)}
        rejectionReason={selectedRejectionItem?.rejection_reason || ''}
        verifiedAt={selectedRejectionItem?.verified_at}
        verifiedBy={selectedRejectionItem?.verified_by ? 'SITE User' : undefined}
      />
    </div>
  );
}
