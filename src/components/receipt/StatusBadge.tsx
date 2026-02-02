import { ReceiptStatus } from '@/types/receipt';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle2, AlertCircle, Eye } from 'lucide-react';

interface StatusBadgeProps {
  status: ReceiptStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<ReceiptStatus, { 
  label: string; 
  className: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  processing: { 
    label: 'Processing', 
    className: 'bg-info/20 text-info',
    icon: Loader2,
  },
  processed: { 
    label: 'Ready for Review', 
    className: 'status-processed',
    icon: CheckCircle2,
  },
  failed: { 
    label: 'Failed', 
    className: 'status-failed',
    icon: AlertCircle,
  },
  reviewed: { 
    label: 'Reviewed', 
    className: 'status-reviewed',
    icon: Eye,
  },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.processing;
  const Icon = config.icon;
  
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs gap-1' 
    : 'px-3 py-1 text-sm gap-1.5';

  return (
    <span className={cn(
      'inline-flex items-center rounded-full font-medium',
      config.className,
      sizeClasses
    )}>
      <Icon className={cn(
        'shrink-0',
        size === 'sm' ? 'h-3 w-3' : 'h-4 w-4',
        status === 'processing' && 'animate-spin'
      )} />
      <span>{config.label}</span>
    </span>
  );
}
