import { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

export function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const { containerRef, isPulling, isRefreshing, pullDistance, pullProgress } = usePullToRefresh({
    onRefresh,
  });

  return (
    <div
      ref={containerRef}
      className={cn('relative h-full overflow-y-auto overscroll-contain', className)}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center',
          'transition-opacity duration-200',
          (isPulling || isRefreshing) ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          top: Math.max(pullDistance - 40, 8),
        }}
      >
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            'bg-primary text-primary-foreground shadow-lg',
            'transition-transform duration-200'
          )}
          style={{
            transform: `scale(${0.5 + pullProgress * 0.5}) rotate(${pullProgress * 180}deg)`,
          }}
        >
          <RefreshCw
            className={cn(
              'h-5 w-5',
              isRefreshing && 'animate-spin'
            )}
          />
        </div>
      </div>

      {/* Content with pull transform */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: isPulling || isRefreshing
            ? `translateY(${isRefreshing ? 50 : pullDistance}px)`
            : 'translateY(0)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
