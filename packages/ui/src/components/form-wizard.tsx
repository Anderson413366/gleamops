'use client';

import { useState, useCallback } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '../utils';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
}

interface FormWizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  loading?: boolean;
  validateStep?: (step: number) => boolean;
}

export function FormWizard({
  steps,
  currentStep,
  onStepChange,
  children,
  onSubmit,
  onCancel,
  submitLabel = 'Submit',
  loading = false,
  validateStep,
}: FormWizardProps) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (validateStep && !validateStep(currentStep)) return;
    if (!isLast) onStepChange(currentStep + 1);
  };

  const handleBack = () => {
    if (!isFirst) onStepChange(currentStep - 1);
  };

  const handleStepClick = (index: number) => {
    // Only allow navigating to completed steps or the next step
    if (index < currentStep) {
      onStepChange(index);
    } else if (index === currentStep + 1) {
      handleNext();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isLast) onSubmit(e);
      }}
      className="flex flex-col h-full"
    >
      {/* Step indicator */}
      <nav aria-label="Form progress" className="px-6 py-5 border-b border-border">
        <ol className="flex items-center w-full">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isFuture = index > currentStep;

            return (
              <li
                key={step.id}
                className={cn('flex items-center', index < steps.length - 1 && 'flex-1')}
              >
                {/* Step circle + label */}
                <button
                  type="button"
                  onClick={() => handleStepClick(index)}
                  disabled={isFuture && index !== currentStep + 1}
                  className={cn(
                    'flex items-center gap-2.5 group focus-visible:outline-none',
                    (isFuture && index !== currentStep + 1) && 'cursor-default'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Step ${index + 1}: ${step.title}${isCompleted ? ' (completed)' : ''}`}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200',
                      isCompleted && 'bg-emerald-600 text-white',
                      isCurrent && 'bg-gleam-600 text-white ring-2 ring-gleam-600 ring-offset-2 ring-offset-white dark:ring-offset-gray-900',
                      isFuture && 'bg-gray-100 text-muted-foreground dark:bg-gray-800'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="hidden sm:flex flex-col text-left">
                    <span
                      className={cn(
                        'text-sm font-medium transition-colors duration-200',
                        isCurrent && 'text-foreground',
                        isCompleted && 'text-foreground',
                        isFuture && 'text-muted-foreground'
                      )}
                    >
                      {step.title}
                    </span>
                    {step.description && (
                      <span className="text-xs text-muted-foreground">{step.description}</span>
                    )}
                  </span>
                </button>

                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'mx-3 h-0.5 flex-1 rounded-full transition-colors duration-200',
                      isCompleted ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'
                    )}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between border-t border-border px-6 py-4 shrink-0">
        <div>
          {isFirst ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gleam-500 focus-visible:ring-offset-2 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gleam-500 focus-visible:ring-offset-2 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground tabular-nums">
            Step {currentStep + 1} of {steps.length}
          </span>
          {isLast ? (
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-gleam-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gleam-700 hover:shadow-md disabled:pointer-events-none disabled:opacity-50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gleam-500 focus-visible:ring-offset-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gleam-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gleam-700 hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gleam-500 focus-visible:ring-offset-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

export function useWizardSteps(totalSteps: number) {
  const [currentStep, setCurrentStep] = useState(0);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < totalSteps) {
        setCurrentStep(step);
      }
    },
    [totalSteps]
  );

  const reset = useCallback(() => {
    setCurrentStep(0);
  }, []);

  return { currentStep, goToStep, reset };
}
