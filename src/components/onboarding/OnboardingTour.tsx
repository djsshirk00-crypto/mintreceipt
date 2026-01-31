import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { OnboardingSpotlight, OnboardingStep } from './OnboardingSpotlight';
import { useUserSettings } from '@/hooks/useUserSettings';
import { supabase } from '@/integrations/supabase/client';

// Current onboarding version - increment when adding new features
const ONBOARDING_VERSION = 1;

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to MintReceipt! 👋',
    description: 'Let me show you around. This quick tour will help you get the most out of your receipt-first budgeting.',
    position: 'center',
    icon: '🎉',
  },
  {
    id: 'upload',
    title: 'Capture Your Receipts',
    description: 'Take a photo of any receipt or upload a screenshot. Our AI will automatically extract the details and categorize your purchases.',
    targetSelector: '[data-onboarding="upload-zone"]',
    position: 'bottom',
    icon: '📸',
  },
  {
    id: 'fab',
    title: 'Quick Capture Button',
    description: 'On mobile, tap this button to quickly snap a receipt photo or add a manual entry. It\'s always within reach!',
    targetSelector: '[data-onboarding="fab"]',
    position: 'top',
    icon: '⚡',
  },
  {
    id: 'status-cards',
    title: 'Track Your Progress',
    description: 'See how many receipts are in your inbox, ready for review, or need attention. Tap any card to dive in.',
    targetSelector: '[data-onboarding="status-cards"]',
    position: 'bottom',
    icon: '📊',
  },
  {
    id: 'spending',
    title: 'Spending Insights',
    description: 'View your spending breakdown by category. We\'ll show you where your money goes each week and month.',
    targetSelector: '[data-onboarding="spending-reports"]',
    position: 'top',
    icon: '💰',
  },
  {
    id: 'navigation',
    title: 'Easy Navigation',
    description: 'Use the bottom navigation to switch between Dashboard, Inbox, Review, Budget, Categories, and Settings.',
    targetSelector: '[data-onboarding="nav"]',
    position: 'top',
    icon: '🧭',
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Start by uploading your first receipt. You can replay this tutorial anytime from Settings.',
    position: 'center',
    icon: '🚀',
  },
];

export function OnboardingTour() {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, isLoading } = useUserSettings();
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Use ref to track if we've processed the initial check - persists across renders
  const hasProcessed = useRef(false);

  const isOnDashboard = location.pathname === '/' || location.pathname.startsWith('/?');

  useEffect(() => {
    // Reset the processed flag when settings change (e.g., after replay)
    if (!isLoading && settings.user_id && settings.onboarding_version_seen === 0) {
      hasProcessed.current = false;
    }
  }, [settings.onboarding_version_seen, settings.user_id, isLoading]);

  useEffect(() => {
    if (isLoading || hasProcessed.current) return;

    // Check if user needs onboarding
    const needsOnboarding = 
      settings.onboarding_version_seen < ONBOARDING_VERSION;

    if (needsOnboarding && settings.user_id) {
      // If not on dashboard, redirect there first for onboarding
      if (!isOnDashboard) {
        navigate('/', { replace: true });
        return;
      }
      
      // Mark as processed before showing
      hasProcessed.current = true;
      
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 500);
      return () => clearTimeout(timer);
    }

    // Mark as processed if user doesn't need onboarding
    hasProcessed.current = true;
  }, [settings, isLoading, isOnDashboard, navigate]);

  const handleComplete = async () => {
    setShowOnboarding(false);
    hasProcessed.current = true;

    // Mark onboarding as complete
    if (settings.user_id) {
      await supabase
        .from('user_settings')
        .update({
          onboarding_completed_at: new Date().toISOString(),
          onboarding_version_seen: ONBOARDING_VERSION,
        })
        .eq('user_id', settings.user_id);
    }
  };

  const handleSkip = async () => {
    setShowOnboarding(false);
    hasProcessed.current = true;

    // Also mark as complete when skipping
    if (settings.user_id) {
      await supabase
        .from('user_settings')
        .update({
          onboarding_version_seen: ONBOARDING_VERSION,
        })
        .eq('user_id', settings.user_id);
    }
  };

  if (!showOnboarding) return null;

  return (
    <OnboardingSpotlight
      steps={onboardingSteps}
      isOpen={showOnboarding}
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  );
}

// Hook to manually trigger onboarding (for Settings replay)
export function useOnboardingTour() {
  const replayTour = async () => {
    // Get current user directly to ensure we have the ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user?.id) {
      // Reset onboarding version to trigger tour
      const { error } = await supabase
        .from('user_settings')
        .update({
          onboarding_version_seen: 0,
          onboarding_completed_at: null,
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to reset onboarding:', error);
        return;
      }

      // Force a hard reload to clear all React state and cache
      // Using href with cache-busting timestamp ensures fresh data
      window.location.href = '/?replay=' + Date.now();
    }
  };

  return { replayTour };
}
