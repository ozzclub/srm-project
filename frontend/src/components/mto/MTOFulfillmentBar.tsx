interface MTOFulfillmentBarProps {
  requestedQty: number;
  fulfilledQty: number;
  unit: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function MTOFulfillmentBar({
  requestedQty,
  fulfilledQty,
  unit,
  showLabel = true,
  size = 'md',
}: MTOFulfillmentBarProps) {
  const percentage = requestedQty > 0 ? Math.min((fulfilledQty / requestedQty) * 100, 100) : 0;
  const remaining = Math.max(0, requestedQty - fulfilledQty);

  const getColorClass = () => {
    if (percentage === 0) return 'bg-gray-300';
    if (percentage < 50) return 'bg-red-500';
    if (percentage < 100) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const heightClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5 text-sm">
          <span className="text-gray-600">
            {fulfilledQty} / {requestedQty} {unit}
          </span>
          <span
            className={`font-semibold ${
              percentage === 100
                ? 'text-green-600'
                : percentage >= 50
                ? 'text-orange-600'
                : 'text-red-600'
            }`}
          >
            {percentage.toFixed(1)}%
          </span>
        </div>
      )}
      <div
        className={`w-full bg-gray-200 rounded-full overflow-hidden ${heightClasses[size]}`}
      >
        <div
          className={`${heightClasses[size]} ${getColorClass()} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && remaining > 0 && (
        <div className="mt-1 text-xs text-gray-500">
          {remaining} {unit} remaining
        </div>
      )}
    </div>
  );
}
