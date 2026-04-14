'use client';

import { useState } from 'react';
import { Check, X, Loader2, Package, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { SPPRequestWithItems } from '@/types/spp.types';

interface SPPSiteApprovalSectionProps {
  spp: SPPRequestWithItems;
  onSiteApprove: (data: {
    approval_status: 'APPROVED' | 'REJECTED';
    approval_notes?: string;
    items?: { item_id: number; receive_qty: number }[];
  }) => Promise<void>;
  onVerifyDelivery?: (itemId: number, data: {
    action: 'VERIFY' | 'REJECT' | 'ADJUST';
    actual_qty?: number;
    rejection_reason?: string;
    notes?: string;
  }) => Promise<void>;
  onDirectReceive?: (itemId: number, data: {
    receive_qty: number;
    notes?: string;
  }) => Promise<void>;
  onItemTypeChange?: (itemId: number, itemType: 'TOOL' | 'MATERIAL') => Promise<void>;
}

export default function SPPSiteApprovalSection({
  spp,
  onSiteApprove,
  onVerifyDelivery,
  onDirectReceive,
  onItemTypeChange,
}: SPPSiteApprovalSectionProps) {
  // Verification states
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [verifyingItemId, setVerifyingItemId] = useState<number | null>(null);
  const [verifyAction, setVerifyAction] = useState<'VERIFY' | 'REJECT' | 'ADJUST' | null>(null);
  const [verifyActualQty, setVerifyActualQty] = useState<number>(0);
  const [verifyRejectReason, setVerifyRejectReason] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Direct receive states
  const [directReceiveQty, setDirectReceiveQty] = useState<Record<number, number>>({});
  const [isDirectReceiving, setIsDirectReceiving] = useState<number | null>(null);
  
  // Item type change state
  const [changingItemType, setChangingItemType] = useState<number | null>(null);

  // Filter items by status
  const pendingVerificationItems = spp.items.filter(item => item.delivery_status === 'SENT');
  const directReceiveItems = spp.items.filter(item => item.delivery_status === 'NOT_SENT' || item.delivery_status === 'REJECTED');

  // Handle verification of Workshop delivery
  const handleVerifyDelivery = async (itemId: number, action: 'VERIFY' | 'REJECT' | 'ADJUST') => {
    if (!onVerifyDelivery) return;

    setIsVerifying(true);
    setVerifyingItemId(itemId);
    setVerifyAction(action);

    try {
      const item = spp.items.find(i => i.id === itemId);
      if (!item) throw new Error('Item not found');

      if (action === 'VERIFY') {
        await onVerifyDelivery(itemId, {
          action: 'VERIFY',
          actual_qty: item.receive_qty,
        });
      } else if (action === 'ADJUST') {
        await onVerifyDelivery(itemId, {
          action: 'ADJUST',
          actual_qty: verifyActualQty,
        });
      } else if (action === 'REJECT') {
        if (!verifyRejectReason.trim()) {
          alert('Alasan penolakan wajib diisi');
          return;
        }
        await onVerifyDelivery(itemId, {
          action: 'REJECT',
          rejection_reason: verifyRejectReason,
        });
      }

      // Reset states
      setVerifyAction(null);
      setVerifyActualQty(0);
      setVerifyRejectReason('');
      setVerifyingItemId(null);
      setExpandedItemId(null);
    } catch (error) {
      console.error('Verification failed:', error);
      alert('Gagal memverifikasi pengiriman');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle direct receive by SITE
  const handleDirectReceive = async (itemId: number) => {
    if (!onDirectReceive) return;

    const qty = directReceiveQty[itemId] || 0;
    if (qty <= 0) {
      alert('Jumlah yang diterima harus lebih dari 0');
      return;
    }

    setIsDirectReceiving(itemId);
    try {
      await onDirectReceive(itemId, {
        receive_qty: qty,
      });

      setDirectReceiveQty(prev => ({ ...prev, [itemId]: 0 }));
    } catch (error) {
      console.error('Direct receive failed:', error);
      alert('Gagal memproses penerimaan barang');
    } finally {
      setIsDirectReceiving(null);
    }
  };

  // Handle item type change by SITE
  const handleItemTypeChange = async (itemId: number, newType: 'TOOL' | 'MATERIAL') => {
    if (!onItemTypeChange) return;

    setChangingItemType(itemId);
    try {
      await onItemTypeChange(itemId, newType);
    } catch (error) {
      console.error('Failed to change item type:', error);
      alert('Gagal mengubah tipe item');
    } finally {
      setChangingItemType(null);
    }
  };

  const toggleExpand = (itemId: number) => {
    setExpandedItemId(expandedItemId === itemId ? null : itemId);
  };

  return (
    <div className="space-y-4">
      {/* Section 1: Items to Receive from Workshop */}
      {pendingVerificationItems.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Menunggu Verifikasi
                </h3>
                <p className="text-sm text-gray-600">
                  {pendingVerificationItems.length} item dari Workshop siap diverifikasi
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {pendingVerificationItems.map((item) => {
              const isExpanded = expandedItemId === item.id;
              const isVerifyingThis = isVerifying && verifyingItemId === item.id;
              const isActionActive = verifyAction !== null && verifyingItemId === item.id;

              return (
                <div key={item.id} className="transition-all">
                  {/* Item Header - Always Visible */}
                  <button
                    onClick={() => toggleExpand(item.id)}
                    disabled={isVerifyingThis}
                    className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">
                            {item.list_item || `Item ${item.list_item_number}`}
                          </h4>
                          {item.rejection_reason && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                              <X className="h-3 w-3" />
                              Ditolak Sebelumnya
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                        <div className="flex items-center gap-4 text-sm mb-2">
                          <span className="text-gray-500">
                            Diminta: <span className="font-medium text-gray-900">{item.request_qty} {item.unit}</span>
                          </span>
                          <span className="text-blue-600 font-medium">
                            Dikirim: {item.receive_qty} {item.unit}
                          </span>
                          {item.item_type === 'TOOL' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              🔧 Tool
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              📦 Consumable
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-6 pb-4 bg-gray-50">
                      {item.rejection_reason && (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                          <p className="text-sm font-medium text-red-900 mb-1">Alasan Penolakan Sebelumnya:</p>
                          <p className="text-sm text-red-700">{item.rejection_reason}</p>
                        </div>
                      )}

                      {/* Item Type Editor - SITE can change if Workshop wrong */}
                      <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 mb-2">Tipe Item (Site Edit)</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleItemTypeChange(item.id, 'TOOL')}
                            disabled={changingItemType === item.id}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition ${
                              item.item_type === 'TOOL'
                                ? 'bg-blue-100 border-blue-300 text-blue-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {changingItemType === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              '🔧'
                            )}
                            Tool
                          </button>
                          <button
                            onClick={() => handleItemTypeChange(item.id, 'MATERIAL')}
                            disabled={changingItemType === item.id}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition ${
                              item.item_type === 'MATERIAL'
                                ? 'bg-green-100 border-green-300 text-green-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {changingItemType === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              '📦'
                            )}
                            Consumable
                          </button>
                          <p className="text-xs text-gray-500 ml-2">
                            Klik untuk mengubah jika Workshop salah input tipe
                          </p>
                        </div>
                      </div>

                      {/* Action Input Area */}
                      {isActionActive ? (
                        <div className="space-y-3 mb-4">
                          {verifyAction === 'ADJUST' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Jumlah Aktual yang Diterima
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={verifyActualQty || item.receive_qty}
                                  onChange={(e) => setVerifyActualQty(parseFloat(e.target.value) || 0)}
                                  min="0"
                                  className="flex h-10 w-32 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <span className="text-sm text-gray-600">{item.unit}</span>
                              </div>
                            </div>
                          )}

                          {verifyAction === 'REJECT' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Alasan Penolakan <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={verifyRejectReason}
                                onChange={(e) => setVerifyRejectReason(e.target.value)}
                                placeholder="Jelaskan alasan penolakan..."
                                rows={3}
                                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                              />
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleVerifyDelivery(item.id, verifyAction!)}
                              disabled={isVerifyingThis || (verifyAction === 'REJECT' && !verifyRejectReason.trim())}
                              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {isVerifyingThis ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Memproses...
                                </>
                              ) : (
                                'Konfirmasi'
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setVerifyAction(null);
                                setVerifyingItemId(null);
                                setVerifyRejectReason('');
                              }}
                              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleVerifyDelivery(item.id, 'VERIFY')}
                            disabled={isVerifyingThis}
                            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Check className="h-4 w-4" />
                            Terima
                          </button>
                          <button
                            onClick={() => {
                              setVerifyingItemId(item.id);
                              setVerifyAction('ADJUST');
                              setVerifyActualQty(item.receive_qty);
                            }}
                            disabled={isVerifyingThis}
                            className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Sesuaikan Jumlah
                          </button>
                          <button
                            onClick={() => {
                              setVerifyingItemId(item.id);
                              setVerifyAction('REJECT');
                            }}
                            disabled={isVerifyingThis}
                            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <X className="h-4 w-4" />
                            Tolak
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 2: Direct Receive */}
      {directReceiveItems.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Penerimaan Langsung
                </h3>
                <p className="text-sm text-gray-600">
                  {directReceiveItems.length} item belum diupdate oleh Workshop
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {directReceiveItems.map((item) => {
              const isReceivingThis = isDirectReceiving === item.id;
              const qty = directReceiveQty[item.id] || 0;

              return (
                <div key={item.id} className="px-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">
                        {item.list_item || `Item ${item.list_item_number}`}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">
                          Diminta: <span className="font-medium text-gray-900">{item.request_qty} {item.unit}</span>
                        </span>
                        {item.rejection_reason && (
                          <span className="text-red-600 text-xs">
                            Sebelumnya ditolak
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={qty || ''}
                          onChange={(e) => setDirectReceiveQty(prev => ({ ...prev, [item.id]: parseFloat(e.target.value) || 0 }))}
                          min="0"
                          max={item.request_qty}
                          placeholder="0"
                          disabled={isReceivingThis}
                          className="flex h-10 w-28 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                        />
                        <span className="text-sm text-gray-600 w-12">{item.unit}</span>
                      </div>
                      <button
                        onClick={() => handleDirectReceive(item.id)}
                        disabled={isReceivingThis || qty <= 0}
                        className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                      >
                        {isReceivingThis ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Memproses...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Terima
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {pendingVerificationItems.length === 0 && directReceiveItems.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-6 py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
            <Check className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Semua Item Telah Diverifikasi</h3>
          <p className="text-sm text-gray-600">
            Tidak ada item yang perlu diproses saat ini.
          </p>
        </div>
      )}
    </div>
  );
}
