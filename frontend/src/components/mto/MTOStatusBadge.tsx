import { CheckCircle, Clock, XCircle, AlertCircle, FileText } from 'lucide-react';

interface MTOStatusBadgeProps {
  status: 'DRAFT' | 'APPROVED' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  DRAFT: {
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: FileText,
    label: 'Draft',
  },
  APPROVED: {
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: CheckCircle,
    label: 'Approved',
  },
  PARTIAL: {
    color: 'bg-orange-100 text-orange-700 border-orange-300',
    icon: AlertCircle,
    label: 'Partial',
  },
  COMPLETED: {
    color: 'bg-green-100 text-green-700 border-green-300',
    icon: CheckCircle,
    label: 'Completed',
  },
  CANCELLED: {
    color: 'bg-red-100 text-red-700 border-red-300',
    icon: XCircle,
    label: 'Cancelled',
  },
};

export default function MTOStatusBadge({ status, size = 'md' }: MTOStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.color} ${sizeClasses[size]}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
      {config.label}
    </span>
  );
}
