'use client';

import { CheckCircle, XCircle, Clock, User } from 'lucide-react';
import type { SPPApproval } from '@/types/spp.types';

interface SPPApprovalTimelineProps {
  approvals: SPPApproval[];
}

const roleLabels: Record<string, string> = {
  workshop: 'Workshop',
  material_site: 'Material Site',
};

const statusConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  PENDING: {
    color: 'text-yellow-700',
    bg: 'bg-yellow-100',
    icon: Clock,
    label: 'Pending',
  },
  APPROVED: {
    color: 'text-green-700',
    bg: 'bg-green-100',
    icon: CheckCircle,
    label: 'Approved',
  },
  REJECTED: {
    color: 'text-red-700',
    bg: 'bg-red-100',
    icon: XCircle,
    label: 'Rejected',
  },
};

export default function SPPApprovalTimeline({ approvals }: SPPApprovalTimelineProps) {
  if (!approvals || approvals.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>No approval history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {approvals.map((approval, index) => {
        const config = statusConfig[approval.approval_status] || statusConfig.PENDING;
        const Icon = config.icon;
        const isLast = index === approvals.length - 1;

        return (
          <div key={approval.id} className="relative">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200" />
            )}

            <div className="flex gap-4">
              {/* Icon */}
              <div
                className={`flex-shrink-0 w-12 h-12 rounded-full ${config.bg} ${config.color} flex items-center justify-center`}
              >
                <Icon className="w-6 h-6" />
              </div>

              {/* Content */}
              <div className="flex-1 bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {roleLabels[approval.approval_role]}
                    </h4>
                    {approval.approved_by_name && (
                      <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                        <User className="w-3 h-3" />
                        <span>{approval.approved_by_name}</span>
                      </div>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}
                  >
                    {config.label}
                  </span>
                </div>

                {approval.approval_notes && (
                  <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                    <p className="text-sm text-gray-700">{approval.approval_notes}</p>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-2">
                  {new Date(approval.approved_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
