import { Link, useLocation } from 'react-router-dom';
import { Home, Inbox, CheckSquare, Receipt, Tags, Target, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FloatingCaptureButton } from './FloatingCaptureButton';
import { PullToRefresh } from './PullToRefresh';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/inbox', label: 'Inbox', icon: Inbox },
  { path: '/review', label: 'Review', icon: CheckSquare },
  { path: '/budget', label: 'Budget', icon: Target },
  { path: '/categories', label: 'Categories', icon: Tags },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const handleRefresh = useCallback(async () => {
    // Invalidate all queries to refresh data
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const content = (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Receipt className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-foreground">MintReceipt</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === path
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="container py-6 md:py-8 pb-24 md:pb-8">
        {children}
      </main>

      {/* Floating Action Button for mobile camera capture */}
      <FloatingCaptureButton />

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden pb-safe">
        <div className="flex items-center justify-around h-16">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors touch-target',
                location.pathname === path
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );

  // Wrap with pull-to-refresh on mobile only
  if (isMobile) {
    return (
      <PullToRefresh onRefresh={handleRefresh} className="h-screen">
        {content}
      </PullToRefresh>
    );
  }

  return content;
}