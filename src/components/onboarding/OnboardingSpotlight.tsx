import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
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
  const [targetFound, setTargetFound] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [highlightVisible, setHighlightVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Find and measure target element with proper validation and timing
  const updateTargetRect = useCallback(async () => {
    setHighlightVisible(false);
    
    if (!step?.targetSelector) {
      setTargetRect(null);
      setTargetFound(false);
      return;
    }

    // Wait for layout to settle
    await new Promise(resolve => setTimeout(resolve, 100));

    const element = document.querySelector(step.targetSelector);
    
    if (!element) {
      console.warn('Tour target not found', { stepId: step.id, targetSelector: step.targetSelector });
      setTargetRect(null);
      setTargetFound(false);
      return;
    }

    setTargetFound(true);

    // Scroll target into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

    // Wait for scroll to complete, then use double RAF for accurate measurement
    await new Promise(resolve => setTimeout(resolve, 350));
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        
        // Validate rect is actually visible in viewport
        const isVisible = 
          rect.top >= -rect.height && 
          rect.left >= -rect.width && 
          rect.bottom <= window.innerHeight + rect.height &&
          rect.right <= window.innerWidth + rect.width &&
          rect.width > 0 && 
          rect.height > 0;

        if (isVisible) {
          setTargetRect(rect);
          setHighlightVisible(true);
        } else {
          console.warn('Tour target not visible in viewport', { stepId: step.id, rect });
          setTargetRect(null);
          setHighlightVisible(false);
        }
      });
    });
  }, [step?.targetSelector, step?.id]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.overflowX = 'hidden';
      return () => {
        document.body.style.overflow = '';
        document.body.style.overflowX = '';
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    updateTargetRect();

    const handleResize = () => {
      // Re-measure on resize with debounce
      setTimeout(updateTargetRect, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isOpen, updateTargetRect, currentStep]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete();
    } else {
      setIsAnimating(true);
      setHighlightVisible(false);
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
        setIsAnimating(false);
      }, 150);
    }
  }, [isLastStep, onComplete]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      setIsAnimating(true);
      setHighlightVisible(false);
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
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        handleNext();
      } else {
        handleBack();
      }
    }
    setTouchStart(null);
  };

  if (!isOpen) return null;

  // Generate description with fallback for missing targets
  const getStepDescription = () => {
    if (step.targetSelector && !targetFound) {
      return `${step.description}\n\nTap Next to continue.`;
    }
    return step.description;
  };

  // Desktop tooltip positioning (unchanged from before)
  const getDesktopTooltipStyle = (): React.CSSProperties => {
    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 200;

    if (!targetRect || step.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: tooltipWidth,
      };
    }

    let top: number | string = '50%';
    let left: number | string = '50%';
    let transform = 'translate(-50%, -50%)';
    const position = step.position || 'bottom';

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

    // Keep in viewport
    if (typeof left === 'number') {
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
    }
    if (typeof top === 'number') {
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));
    }

    return { top, left, transform, width: tooltipWidth };
  };

  // Mobile bottom sheet content
  const MobileBottomSheet = () => (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[110]",
        "bg-card border-t border-border rounded-t-3xl shadow-elevated",
        "transition-all duration-200 ease-out",
        isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
      )}
      style={{
        maxHeight: 'calc(100vh - 100px)',
        paddingBottom: 'env(safe-area-inset-bottom, 16px)',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drag handle indicator */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
      </div>

      {/* Content area with scroll */}
      <div 
        className="px-5 overflow-y-auto"
        style={{ 
          maxHeight: 'calc(100vh - 200px)',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 p-2.5 text-muted-foreground hover:text-foreground rounded-full transition-colors"
          aria-label="Skip tutorial"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Step content */}
        <div className="space-y-3 pb-2">
          {step.icon && (
            <span className="block text-4xl">{step.icon}</span>
          )}
          <h3 className="text-xl font-semibold text-foreground pr-10">
            {step.title}
          </h3>
          <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-line">
            {getStepDescription()}
          </p>
        </div>

        {/* Swipe hint */}
        {!isFirstStep && !isLastStep && (
          <p className="text-xs text-muted-foreground/60 text-center mt-2">
            Swipe left/right to navigate
          </p>
        )}
      </div>

      {/* Sticky footer with progress and navigation */}
      <div 
        className="sticky bottom-0 px-5 py-4 bg-card border-t border-border mt-4"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        }}
      >
        <div className="flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex gap-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (index !== currentStep) {
                    setIsAnimating(true);
                    setHighlightVisible(false);
                    setTimeout(() => {
                      setCurrentStep(index);
                      setIsAnimating(false);
                    }, 150);
                  }
                }}
                className={cn(
                  'h-2.5 rounded-full transition-all duration-200 min-w-[10px]',
                  index === currentStep
                    ? 'w-7 bg-primary'
                    : index < currentStep
                    ? 'w-2.5 bg-primary/50'
                    : 'w-2.5 bg-muted'
                )}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {!isFirstStep && (
              <Button
                variant="ghost"
                size="default"
                onClick={handleBack}
                className="gap-1 h-11 px-4"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <Button 
              size="default" 
              onClick={handleNext} 
              className="gap-1 h-11 px-6 min-w-[100px]"
            >
              {isLastStep ? (
                "Get Started"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Desktop tooltip content
  const DesktopTooltip = () => (
    <div
      className={cn(
        'absolute z-[110] p-5 bg-card border border-border rounded-2xl shadow-elevated',
        'transition-all duration-150 ease-out',
        isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      )}
      style={getDesktopTooltipStyle()}
    >
      <button
        onClick={handleSkip}
        className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-foreground rounded-full transition-colors"
        aria-label="Skip tutorial"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="space-y-2.5">
        {step.icon && <span className="block text-3xl">{step.icon}</span>}
        <h3 className="text-lg font-semibold text-foreground pr-8">
          {step.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {step.description}
        </p>
      </div>

      <div className="flex items-center justify-between mt-6">
        <div className="flex gap-1.5">
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
                'h-2 rounded-full transition-all duration-200',
                index === currentStep
                  ? 'w-6 bg-primary'
                  : index < currentStep
                  ? 'w-2 bg-primary/50'
                  : 'w-2 bg-muted'
              )}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {!isFirstStep && (
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <Button size="sm" onClick={handleNext} className="gap-1">
            {isLastStep ? (
              "Get Started"
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  // Render highlight ring - fixed position, appended to body via portal
  const HighlightRing = () => {
    if (!targetRect || !highlightVisible) return null;

    const padding = 10;
    
    return (
      <div
        className="fixed pointer-events-none"
        style={{
          top: targetRect.top - padding,
          left: targetRect.left - padding,
          width: targetRect.width + padding * 2,
          height: targetRect.height + padding * 2,
          zIndex: 105,
          boxSizing: 'border-box',
        }}
      >
        {/* Outer glow */}
        <div 
          className="absolute inset-0 rounded-xl"
          style={{
            boxShadow: '0 0 0 4px hsl(var(--primary) / 0.3), 0 0 20px 8px hsl(var(--primary) / 0.2)',
          }}
        />
        {/* Border ring with pulse animation */}
        <div 
          className="absolute inset-0 rounded-xl border-2 border-primary animate-pulse"
        />
        {/* Inner highlight */}
        <div 
          className="absolute inset-1 rounded-lg"
          style={{
            background: 'hsl(var(--primary) / 0.05)',
          }}
        />
      </div>
    );
  };

  // Mobile highlight indicator that appears near the target
  const MobileHighlightIndicator = () => {
    if (!highlightVisible || !targetRect || !isMobile) return null;

    return (
      <div 
        className="fixed left-4 right-4 p-3 bg-card/95 backdrop-blur-sm rounded-xl border border-border flex items-center gap-3 shadow-lg"
        style={{ 
          zIndex: 106,
          top: Math.min(targetRect.bottom + 16, window.innerHeight - 180),
        }}
      >
        <div className="w-3 h-3 rounded-full bg-primary animate-pulse flex-shrink-0" />
        <span className="text-sm text-muted-foreground">
          Look at the highlighted element above
        </span>
      </div>
    );
  };

  const content = (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{ 
        overflowX: 'hidden',
        touchAction: 'none',
      }}
    >
      {/* Overlay backdrop */}
      <div 
        className="absolute inset-0"
        onClick={(e) => e.stopPropagation()}
      >
        {targetRect && highlightVisible && !isMobile ? (
          // Desktop: SVG spotlight with cutout
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <mask id="spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <rect
                  x={targetRect.left - 10}
                  y={targetRect.top - 10}
                  width={targetRect.width + 20}
                  height={targetRect.height + 20}
                  rx="12"
                  fill="black"
                />
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
            />
          </svg>
        ) : targetRect && highlightVisible && isMobile ? (
          // Mobile: SVG spotlight with cutout for target
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <mask id="mobile-spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <rect
                  x={targetRect.left - 10}
                  y={targetRect.top - 10}
                  width={targetRect.width + 20}
                  height={targetRect.height + 20}
                  rx="12"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.75)"
              mask="url(#mobile-spotlight-mask)"
              style={{ pointerEvents: 'auto' }}
            />
          </svg>
        ) : (
          // No target or not visible: simple overlay
          <div 
            className="absolute inset-0 bg-black/80"
            style={{ pointerEvents: 'auto' }}
          />
        )}
      </div>

      {/* Highlight ring around target - rendered via fixed positioning */}
      <HighlightRing />

      {/* Mobile indicator showing where to look - only when highlight is visible */}
      <MobileHighlightIndicator />

      {/* Tooltip or Bottom Sheet based on device */}
      {isMobile ? <MobileBottomSheet /> : <DesktopTooltip />}
    </div>
  );

  return createPortal(content, document.body);
}
