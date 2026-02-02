import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, CheckSquare, Receipt, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FloatingCaptureButton } from './FloatingCaptureButton';
import { PullToRefresh } from './PullToRefresh';
import { MenuDrawer } from './MenuDrawer';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppLayoutProps {
  children: React.ReactNode;
}

// Mobile: 4 core tabs (Dashboard, Transactions, Review, Menu)
const mobileNavItems = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/transactions', label: 'Transactions', icon: Receipt },
  { path: '/review', label: 'Review', icon: CheckSquare },
];

// Desktop: full navigation
const desktopNavItems = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/transactions', label: 'Transactions', icon: Receipt },
  { path: '/review', label: 'Review', icon: CheckSquare },
  { path: '/categories', label: 'Categories' },
  { path: '/budget', label: 'Budget' },
  { path: '/settings', label: 'Settings' },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const MobileNav = () => (
    <nav data-tour="nav" className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 pb-safe">
        {mobileNavItems.map(({ path, label, icon: Icon }) => (
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
        {/* Menu button */}
        <button
          onClick={() => setMenuOpen(true)}
          className={cn(
            'flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors touch-target',
            'text-muted-foreground'
          )}
        >
          <Menu className="h-5 w-5" />
          Menu
        </button>
      </div>
    </nav>
  );

  const mainContent = (
    <div className="min-h-screen bg-background overflow-x-hidden w-full max-w-full">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Receipt className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-foreground">MintReceipt</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {desktopNavItems.map(({ path, label }) => (
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
    </div>
  );

  // Mobile layout with nav outside PullToRefresh to keep it fixed
  if (isMobile) {
    return (
      <>
        <PullToRefresh onRefresh={handleRefresh} className="h-screen">
          {mainContent}
        </PullToRefresh>
        <FloatingCaptureButton />
        <MobileNav />
        <MenuDrawer open={menuOpen} onOpenChange={setMenuOpen} />
      </>
    );
  }

  // Desktop layout
  return (
    <>
      {mainContent}
      <FloatingCaptureButton />
    </>
  );
}