import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string; // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon?: string;
}

interface OnboardingSpotlightProps {
  steps: OnboardingStep[];
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  currentStep?: number;
}

export function OnboardingSpotlight({
  steps,
  isOpen,
  onComplete,
  onSkip,
  currentStep: initialStep = 0,
}: OnboardingSpotlightProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const isMobile = useIsMobile();

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Find and measure target element
  const updateTargetRect = useCallback(() => {
    if (!step?.targetSelector) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(step.targetSelector);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [step?.targetSelector]);

  useEffect(() => {
    if (!isOpen) return;

    updateTargetRect();

    // Update on resize/scroll
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [isOpen, updateTargetRect, currentStep]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete();
    } else {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
        setIsAnimating(false);
      }, 150);
    }
  }, [isLastStep, onComplete]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev - 1);
        setIsAnimating(false);
      }, 150);
    }
  }, [isFirstStep]);

  const handleSkip = () => {
    onSkip();
  };

  // Swipe gesture handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    const threshold = 50; // Minimum swipe distance

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swipe left - next
        handleNext();
      } else {
        // Swipe right - back
        handleBack();
      }
    }
    setTouchStart(null);
  };

  if (!isOpen) return null;

  // Calculate tooltip position - optimized for mobile
  const getTooltipStyle = (): React.CSSProperties => {
    const safeAreaBottom = isMobile ? 100 : 0; // Account for bottom nav on mobile
    const padding = isMobile ? 12 : 16;
    const tooltipWidth = isMobile ? Math.min(320, window.innerWidth - 32) : 320;
    const tooltipHeight = isMobile ? 220 : 200;

    if (!targetRect || step.position === 'center') {
      // On mobile, position centered cards slightly higher to avoid bottom nav
      return {
        top: isMobile ? '40%' : '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: tooltipWidth,
      };
    }

    let top: number | string = '50%';
    let left: number | string = '50%';
    let transform = 'translate(-50%, -50%)';

    // On mobile, prefer bottom or top positioning to keep tooltip visible
    let position = step.position || 'bottom';
    
    // Smart repositioning on mobile
    if (isMobile) {
      const viewportHeight = window.innerHeight;
      const targetCenter = targetRect.top + targetRect.height / 2;
      
      // If target is in upper half, show tooltip below; if lower half, show above
      if (targetCenter < viewportHeight / 2) {
        position = 'bottom';
      } else {
        position = 'top';
      }
    }

    switch (position) {
      case 'top':
        top = targetRect.top - tooltipHeight - padding;
        left = targetRect.left + targetRect.width / 2;
        transform = 'translateX(-50%)';
        break;
      case 'bottom':
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2;
        transform = 'translateX(-50%)';
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.left - tooltipWidth - padding;
        transform = 'translateY(-50%)';
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.right + padding;
        transform = 'translateY(-50%)';
        break;
    }

    // Keep tooltip in viewport with safe areas
    if (typeof left === 'number') {
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
    }
    if (typeof top === 'number') {
      const maxTop = window.innerHeight - tooltipHeight - padding - safeAreaBottom;
      top = Math.max(padding, Math.min(top, maxTop));
    }

    return { top, left, transform, width: tooltipWidth };
  };

  const content = (
    <div 
      className="fixed inset-0 z-[100]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Overlay with spotlight cutout */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.8)"
          mask="url(#spotlight-mask)"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        />
      </svg>

      {/* Highlight ring around target */}
      {targetRect && (
        <div
          className="absolute border-2 border-primary rounded-xl pointer-events-none animate-pulse"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {/* Tooltip Card - Mobile optimized */}
      <div
        className={cn(
          'absolute z-10 p-5 bg-card border border-border rounded-2xl shadow-elevated',
          'transition-all duration-150 ease-out',
          isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100',
          isMobile && 'max-w-[calc(100vw-1.5rem)]'
        )}
        style={getTooltipStyle()}
      >
        {/* Skip button - larger touch target on mobile */}
        <button
          onClick={handleSkip}
          className={cn(
            'absolute top-2 right-2 text-muted-foreground hover:text-foreground rounded-full transition-colors',
            isMobile ? 'p-2.5' : 'p-1.5'
          )}
          aria-label="Skip tutorial"
        >
          <X className={cn(isMobile ? 'h-5 w-5' : 'h-4 w-4')} />
        </button>

        {/* Step content */}
        <div className="space-y-2.5">
          {step.icon && (
            <span className={cn('block', isMobile ? 'text-4xl' : 'text-3xl')}>
              {step.icon}
            </span>
          )}
          <h3 className={cn(
            'font-semibold text-foreground pr-8',
            isMobile ? 'text-xl' : 'text-lg'
          )}>
            {step.title}
          </h3>
          <p className={cn(
            'text-muted-foreground leading-relaxed',
            isMobile ? 'text-base' : 'text-sm'
          )}>
            {step.description}
          </p>
        </div>

        {/* Swipe hint on mobile */}
        {isMobile && !isFirstStep && !isLastStep && (
          <p className="text-xs text-muted-foreground/60 text-center mt-3">
            Swipe to navigate
          </p>
        )}

        {/* Progress & Navigation */}
        <div className={cn(
          'flex items-center justify-between',
          isMobile ? 'mt-5' : 'mt-6'
        )}>
          {/* Progress dots - larger on mobile */}
          <div className={cn('flex', isMobile ? 'gap-2' : 'gap-1.5')}>
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (index !== currentStep) {
                    setIsAnimating(true);
                    setTimeout(() => {
                      setCurrentStep(index);
                      setIsAnimating(false);
                    }, 150);
                  }
                }}
                className={cn(
                  'rounded-full transition-all duration-200',
                  isMobile ? 'h-2.5' : 'h-2',
                  index === currentStep
                    ? cn(isMobile ? 'w-7' : 'w-6', 'bg-primary')
                    : index < currentStep
                    ? cn(isMobile ? 'w-2.5' : 'w-2', 'bg-primary/50')
                    : cn(isMobile ? 'w-2.5' : 'w-2', 'bg-muted')
                )}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation buttons - larger touch targets on mobile */}
          <div className={cn('flex', isMobile ? 'gap-3' : 'gap-2')}>
            {!isFirstStep && (
              <Button
                variant="ghost"
                size={isMobile ? 'default' : 'sm'}
                onClick={handleBack}
                className="gap-1"
              >
                <ChevronLeft className={cn(isMobile ? 'h-5 w-5' : 'h-4 w-4')} />
                {!isMobile && 'Back'}
              </Button>
            )}
            <Button 
              size={isMobile ? 'default' : 'sm'} 
              onClick={handleNext} 
              className={cn('gap-1', isMobile && 'px-5')}
            >
              {isLastStep ? (
                "Get Started"
              ) : (
                <>
                  Next
                  <ChevronRight className={cn(isMobile ? 'h-5 w-5' : 'h-4 w-4')} />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
