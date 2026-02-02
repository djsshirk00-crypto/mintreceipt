import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocation, useNavigate } from 'react-router-dom';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon?: string;
  /** Route where the target element lives (e.g., '/', '/review') */
  targetRoute?: string;
}

interface OnboardingSpotlightProps {
  steps: OnboardingStep[];
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  currentStep?: number;
}

// Debug mode query param
const isDebugMode = () => {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('tourDebug') === '1';
};

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
  const [targetError, setTargetError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [highlightVisible, setHighlightVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{ selector: string; rect: DOMRect | null; route: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const debug = isDebugMode();

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Wait for double RAF for layout stability
  const waitForLayout = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  }, []);

  // Find and measure target element with proper validation and timing
  const updateTargetRect = useCallback(async () => {
    setHighlightVisible(false);
    setTargetError(null);
    setDebugInfo(null);
    
    if (!step?.targetSelector) {
      setTargetRect(null);
      setTargetFound(false);
      return;
    }

    // Check if we need to navigate to a different route first
    if (step.targetRoute && location.pathname !== step.targetRoute) {
      navigate(step.targetRoute, { replace: true });
      // Wait for navigation and render
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Wait for layout to settle (double RAF)
    await waitForLayout();
    await new Promise(resolve => setTimeout(resolve, 100));

    const element = document.querySelector(step.targetSelector);
    
    if (!element) {
      const errorMsg = `Target not found: ${step.targetSelector}`;
      console.warn('Onboarding target not found', { stepId: step.id, targetSelector: step.targetSelector, step });
      setTargetRect(null);
      setTargetFound(false);
      setTargetError(errorMsg);
      
      if (debug) {
        setDebugInfo({ 
          selector: step.targetSelector, 
          rect: null, 
          route: location.pathname 
        });
      }
      return;
    }

    setTargetFound(true);
    setTargetError(null);

    // Scroll target into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

    // Wait for scroll to complete
    await new Promise(resolve => setTimeout(resolve, 350));
    
    // Double RAF for accurate measurement after scroll
    await waitForLayout();

    const rect = element.getBoundingClientRect();
    
    // Validate rect is actually visible in viewport
    const isVisible = 
      rect.top >= -rect.height && 
      rect.left >= -rect.width && 
      rect.bottom <= window.innerHeight + rect.height &&
      rect.right <= window.innerWidth + rect.width &&
      rect.width > 0 && 
      rect.height > 0;

    if (debug) {
      setDebugInfo({ 
        selector: step.targetSelector, 
        rect: rect, 
        route: location.pathname 
      });
    }

    if (isVisible) {
      setTargetRect(rect);
      setHighlightVisible(true);
    } else {
      console.warn('Tour target not visible in viewport', { stepId: step.id, rect });
      setTargetRect(null);
      setHighlightVisible(false);
      setTargetError(`Target exists but not visible in viewport`);
    }
  }, [step?.targetSelector, step?.id, step?.targetRoute, location.pathname, navigate, waitForLayout, debug]);

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

  // Update target rect when step changes or viewport changes
  useEffect(() => {
    if (!isOpen) return;

    updateTargetRect();

    const handleResize = () => {
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

  // Desktop tooltip positioning
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

  // Debug panel component
  const DebugPanel = () => {
    if (!debug) return null;
    
    return (
      <div 
        className="fixed top-4 left-4 right-4 z-[200] p-3 bg-black/90 text-white text-xs font-mono rounded-lg"
        style={{ maxWidth: '400px' }}
      >
        <div className="font-bold text-yellow-400 mb-2">🐛 Tour Debug Mode</div>
        <div>Step: {currentStep + 1}/{steps.length} ({step.id})</div>
        <div>Route: {location.pathname}</div>
        <div>Selector: {step.targetSelector || 'none'}</div>
        {debugInfo?.rect && (
          <div className="mt-1 text-green-400">
            Rect: top={Math.round(debugInfo.rect.top)}, left={Math.round(debugInfo.rect.left)}, 
            w={Math.round(debugInfo.rect.width)}, h={Math.round(debugInfo.rect.height)}
          </div>
        )}
        {targetError && (
          <div className="mt-1 text-red-400">Error: {targetError}</div>
        )}
        <div className="mt-1">
          Target found: {targetFound ? '✅' : '❌'} | Highlight visible: {highlightVisible ? '✅' : '❌'}
        </div>
      </div>
    );
  };

  // Mobile bottom sheet content
  const MobileBottomSheet = () => (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[60]",
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
            {step.description}
          </p>
          
          {/* Warning when target not found */}
          {step.targetSelector && targetError && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-destructive">
                <div className="font-medium">Highlight failed: target not found</div>
                <div className="text-xs opacity-80 mt-0.5 font-mono">{step.targetSelector}</div>
              </div>
            </div>
          )}
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
        'absolute z-[60] p-5 bg-card border border-border rounded-2xl shadow-elevated',
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
        
        {/* Warning when target not found */}
        {step.targetSelector && targetError && (
          <div className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg text-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-destructive">
              <div className="font-medium">Highlight failed</div>
              <div className="opacity-80 font-mono">{step.targetSelector}</div>
            </div>
          </div>
        )}
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

  const content = (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[40] overflow-hidden"
      style={{ 
        overflowX: 'hidden',
        touchAction: 'none',
      }}
    >
      {/* Dim backdrop - z-index 40 */}
      <div 
        className="absolute inset-0 bg-black/80"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 40 }}
      />

      {/* Highlight overlay - z-index 50, rendered via portal for proper positioning */}
      {targetRect && highlightVisible && (
        <TourHighlightOverlay rect={targetRect} debug={debug} />
      )}

      {/* Debug panel */}
      <DebugPanel />

      {/* Tooltip or Bottom Sheet based on device - z-index 60 */}
      {isMobile ? <MobileBottomSheet /> : <DesktopTooltip />}
    </div>
  );

  return createPortal(content, document.body);
}

// Dedicated highlight overlay component - rendered via portal
interface TourHighlightOverlayProps {
  rect: DOMRect;
  debug?: boolean;
}

function TourHighlightOverlay({ rect, debug }: TourHighlightOverlayProps) {
  const padding = 12;
  
  // Create the overlay as a portal to document.body
  // This ensures it's not affected by any parent overflow:hidden or positioning
  const overlay = (
    <>
      {/* SVG mask to create the spotlight cutout */}
      <svg 
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 45 }}
        width="100%"
        height="100%"
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - padding}
              y={rect.top - padding}
              width={rect.width + padding * 2}
              height={rect.height + padding * 2}
              rx="12"
              ry="12"
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
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Highlight ring around target - fixed position, z-index 50 */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
          zIndex: 50,
          boxSizing: 'border-box',
        }}
      >
        {/* Outer glow */}
        <div 
          className="absolute inset-0 rounded-xl"
          style={{
            boxShadow: '0 0 0 4px hsl(var(--primary) / 0.4), 0 0 24px 10px hsl(var(--primary) / 0.25)',
          }}
        />
        {/* Border ring with pulse animation */}
        <div 
          className="absolute inset-0 rounded-xl border-2 border-primary animate-pulse"
        />
        {/* Inner highlight fill */}
        <div 
          className="absolute inset-1 rounded-lg"
          style={{
            background: 'hsl(var(--primary) / 0.08)',
          }}
        />
      </div>

      {/* Debug indicator - red dot at top-left of highlight */}
      {debug && (
        <div
          className="fixed w-3 h-3 bg-red-500 rounded-full border-2 border-white"
          style={{
            top: rect.top - padding - 6,
            left: rect.left - padding - 6,
            zIndex: 51,
          }}
        />
      )}
    </>
  );

  return createPortal(overlay, document.body);
}
