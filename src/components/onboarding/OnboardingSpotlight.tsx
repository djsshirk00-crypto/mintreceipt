import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

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

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev - 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  if (!isOpen) return null;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect || step.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 200;

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

    // Keep tooltip in viewport
    if (typeof left === 'number') {
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
    }
    if (typeof top === 'number') {
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));
    }

    return { top, left, transform };
  };

  const content = (
    <div className="fixed inset-0 z-[100]">
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
          fill="rgba(0, 0, 0, 0.75)"
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

      {/* Tooltip */}
      <div
        className={cn(
          'absolute z-10 w-80 max-w-[calc(100vw-2rem)] p-6 bg-card border border-border rounded-2xl shadow-elevated',
          'transition-opacity duration-150',
          isAnimating ? 'opacity-0' : 'opacity-100'
        )}
        style={getTooltipStyle()}
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
          aria-label="Skip tutorial"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Step content */}
        <div className="space-y-3">
          {step.icon && (
            <span className="text-3xl">{step.icon}</span>
          )}
          <h3 className="text-lg font-semibold text-foreground pr-6">
            {step.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Progress & Navigation */}
        <div className="flex items-center justify-between mt-6">
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'h-2 rounded-full transition-all duration-200',
                  index === currentStep
                    ? 'w-6 bg-primary'
                    : index < currentStep
                    ? 'w-2 bg-primary/50'
                    : 'w-2 bg-muted'
                )}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="gap-1"
              >
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
    </div>
  );

  return createPortal(content, document.body);
}
