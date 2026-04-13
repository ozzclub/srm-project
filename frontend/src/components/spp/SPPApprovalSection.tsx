'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { SPPRequestWithItems, SPPApproval, ApproveSPPDTO } from '@/types/spp.types';

interface SPPApprovalSectionProps {
  spp: SPPRequestWithItems;
  userRole: string;
  onApprove: (data: ApproveSPPDTO) => Promise<void>;
  onUpdateReceive?: (itemId: number, receiveQty: number) => Promise<void>;
}

export default function SPPApprovalSection({
  spp,
  userRole,
  onApprove,
  onUpdateReceive,
}: SPPApprovalSectionProps) {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<number, number>>(
    spp.items.reduce((acc, item) => ({ ...acc, [item.id]: item.receive_qty }), {})
  );

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove({
        approval_role: userRole as 'workshop' | 'material_site',
        approval_status: 'APPROVED',
        approval_notes: approvalNotes || undefined,
      });
      setApprovalNotes('');
    } catch (error) {
      console.error('Approval failed:', error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setIsRejecting(true);
    try {
      await onApprove({
        approval_role: userRole as 'workshop' | 'material_site',
        approval_status: 'REJECTED',
        approval_notes: rejectReason,
      });
      setRejectReason('');
      setShowRejectReason(false);
    } catch (error) {
      console.error('Rejection failed:', error);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleReceiveQtyChange = (itemId: number, value: number) => {
    setReceiveQtys((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleUpdateReceive = async (itemId: number) => {
    if (!onUpdateReceive) return;
    await onUpdateReceive(itemId, receiveQtys[itemId] || 0);
  };

  const canApprove = spp.status !== 'COMPLETED' && spp.status !== 'CANCELLED';

  return (
    <div className="space-y-6">
      {/* Workshop: Update Receive Quantities */}
      {userRole === 'workshop' && onUpdateReceive && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Received Quantities</h3>
          <div className="space-y-3">
            {spp.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.description}</p>
                  <p className="text-sm text-gray-600">
                    Requested: {item.request_qty} {item.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={receiveQtys[item.id] || 0}
                    onChange={(e) =>
                      handleReceiveQtyChange(item.id, parseFloat(e.target.value) || 0)
                    }
                    min="0"
                    step="0.01"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Receive qty"
                  />
                  <button
                    onClick={() => handleUpdateReceive(item.id)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                  >
                    Update
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Material Site / Workshop: Approval Section */}
      {canApprove && (userRole === 'material_site' || userRole === 'workshop') && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {userRole === 'material_site' ? 'Approve SPP Request' : 'Confirm & Send'}
          </h3>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Add any notes or remarks..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApproving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              <span>
                {userRole === 'material_site' ? 'Approve' : 'Confirm & Send to Site'}
              </span>
            </button>

            {!showRejectReason ? (
              <button
                onClick={() => setShowRejectReason(true)}
                disabled={isRejecting}
                className="flex items-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition font-medium disabled:opacity-50"
              >
                <XCircle className="w-5 h-5" />
                <span>Reject</span>
              </button>
            ) : (
              <div className="flex-1 space-y-2">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection (required)"
                  rows={2}
                  className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 resize-none"
                  required
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleReject}
                    disabled={!rejectReason.trim() || isRejecting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRejecting ? 'Processing...' : 'Confirm Reject'}
                  </button>
                  <button
                    onClick={() => setShowRejectReason(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
