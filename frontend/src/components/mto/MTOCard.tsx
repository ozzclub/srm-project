import { Calendar, User, Building2, FileText, Clock } from 'lucide-react';
import MTOStatusBadge from './MTOStatusBadge';
import { format } from 'date-fns';

interface MTOCardProps {
  mtoNumber: string;
  projectName: string;
  workOrderNo?: string | null;
  requestDate: string;
  requiredDate?: string | null;
  requestedBy: string;
  approvedBy?: string | null;
  status: 'DRAFT' | 'APPROVED' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';
  notes?: string | null;
  totalItems?: number;
  completedItems?: number;
  fulfillmentPercentage?: number;
  actionButtons?: React.ReactNode;
}

export default function MTOCard({
  mtoNumber,
  projectName,
  workOrderNo,
  requestDate,
  requiredDate,
  requestedBy,
  approvedBy,
  status,
  notes,
  totalItems,
  completedItems,
  fulfillmentPercentage,
  actionButtons,
}: MTOCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">{mtoNumber}</h2>
            <MTOStatusBadge status={status} size="lg" />
          </div>
          <p className="text-lg text-gray-700 font-medium">{projectName}</p>
          {workOrderNo && (
            <p className="text-sm text-gray-500 mt-1">
              WO: <span className="font-mono">{workOrderNo}</span>
            </p>
          )}
        </div>

        {actionButtons && <div className="flex gap-2">{actionButtons}</div>}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-gray-400" />
          <div>
            <div className="text-gray-500">Request Date</div>
            <div className="font-medium text-gray-900">
              {format(new Date(requestDate), 'MMM dd, yyyy')}
            </div>
          </div>
        </div>

        {requiredDate && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-gray-500">Required Date</div>
              <div className="font-medium text-gray-900">
                {format(new Date(requiredDate), 'MMM dd, yyyy')}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-gray-400" />
          <div>
            <div className="text-gray-500">Requested By</div>
            <div className="font-medium text-gray-900">{requestedBy}</div>
          </div>
        </div>

        {approvedBy && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-gray-500">Approved By</div>
              <div className="font-medium text-gray-900">{approvedBy}</div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {totalItems !== undefined && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Total Items</div>
              <div className="text-xl font-bold text-gray-900">{totalItems}</div>
            </div>
            <div>
              <div className="text-gray-500">Completed</div>
              <div className="text-xl font-bold text-green-600">{completedItems || 0}</div>
            </div>
            {fulfillmentPercentage !== undefined && (
              <div>
                <div className="text-gray-500">Fulfillment</div>
                <div className="text-xl font-bold text-blue-600">
                  {(Number(fulfillmentPercentage) || 0).toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div className="border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-500 mb-1">Notes</div>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">{notes}</div>
        </div>
      )}
    </div>
  );
}
