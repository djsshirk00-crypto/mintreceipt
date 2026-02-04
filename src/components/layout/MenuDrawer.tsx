import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Target, 
  Settings, 
  HelpCircle, 
  RotateCcw, 
  LogOut,
  ChevronRight,
  User,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOnboardingTour } from '@/components/onboarding/OnboardingTour';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  to?: string;
  onClick?: () => void;
  destructive?: boolean;
}

function MenuItem({ icon, label, to, onClick, destructive }: MenuItemProps) {
  const content = (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
      'hover:bg-muted active:bg-muted/80',
      destructive && 'text-destructive hover:bg-destructive/10'
    )}>
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 font-medium">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );

  if (to) {
    return <Link to={to} className="block">{content}</Link>;
  }

  return (
    <button onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
}

interface MenuDrawerProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MenuDrawer({ trigger, open, onOpenChange }: MenuDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const navigate = useNavigate();
  const { replayTour } = useOnboardingTour();

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      navigate('/auth');
    } catch (error) {
      toast.error('Failed to sign out');
    }
    setIsOpen(false);
  };

  const handleReplayTutorial = () => {
    setIsOpen(false);
    replayTour();
  };

  const handleMenuItemClick = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Menu</DrawerTitle>
        </DrawerHeader>
        
        <div className="px-4 pb-8 space-y-1">
          {/* Primary menu items */}
          <MenuItem 
            icon={<Target className="h-5 w-5" />} 
            label="Budget & Categories"
            onClick={() => handleMenuItemClick('/budget')}
          />
          <MenuItem 
            icon={<BarChart3 className="h-5 w-5" />} 
            label="Reports"
            onClick={() => handleMenuItemClick('/reports')}
          />
          <MenuItem 
            icon={<Settings className="h-5 w-5" />} 
            label="Settings"
            onClick={() => handleMenuItemClick('/settings')}
          />

          <Separator className="my-4" />

          {/* Secondary actions */}
          <MenuItem 
            icon={<RotateCcw className="h-5 w-5" />} 
            label="Replay Tutorial"
            onClick={handleReplayTutorial}
          />
          <MenuItem 
            icon={<HelpCircle className="h-5 w-5" />} 
            label="Help & Support"
            onClick={() => toast.info('Help & Support coming soon!')}
          />

          <Separator className="my-4" />

          {/* Account */}
          <MenuItem 
            icon={<User className="h-5 w-5" />} 
            label="Account"
            onClick={() => handleMenuItemClick('/settings')}
          />
          <MenuItem 
            icon={<LogOut className="h-5 w-5" />} 
            label="Sign Out"
            onClick={handleSignOut}
            destructive
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
