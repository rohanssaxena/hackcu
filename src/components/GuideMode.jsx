import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Play } from 'lucide-react';

export function GuideModePrompt({ onAccept, onDecline, title, description }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-elevated rounded-lg p-6 max-w-md mx-4 border border-border">
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          {title || "Use Guide Mode?"}
        </h3>
        <p className="text-text-secondary mb-6">
          {description || "This task requires multiple steps. Would you like me to guide you through it step by step?"}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 px-4 py-2 border border-border rounded-md text-text-primary hover:bg-bg-primary"
          >
            No, I'll do it myself
          </button>
          <button
            onClick={onAccept}
            className="flex-1 px-4 py-2 bg-accent-blue text-white rounded-md hover:bg-accent-blue/80 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Guide me
          </button>
        </div>
      </div>
    </div>
  );
}

export function GuideMode({ steps, onComplete, onExit }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isWaitingForUser, setIsWaitingForUser] = useState(false);

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  useEffect(() => {
    // Check if current step requires user action
    if (currentStep?.requiresUserAction) {
      setIsWaitingForUser(true);
    } else {
      setIsWaitingForUser(false);
      // Auto-advance steps that don't require user action
      const timer = setTimeout(() => {
        if (!isLastStep) {
          handleContinue();
        }
      }, currentStep?.autoAdvanceDelay || 2000);
      
      return () => clearTimeout(timer);
    }
  }, [currentStepIndex, currentStep, isLastStep]);

  const handleContinue = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleExit = () => {
    onExit();
  };

  const handleStepAction = () => {
    if (currentStep?.onAction) {
      currentStep.onAction();
    }
  };

  return (
    <>
      {/* Blue glow overlay around main content */}
      <div className="fixed inset-0 pointer-events-none z-40">
        <div className="absolute inset-4 border-4 border-accent-blue rounded-lg opacity-50 animate-pulse" />
        <div className="absolute inset-3 border-2 border-accent-blue rounded-lg opacity-70" />
        <div className="absolute inset-2 border border-accent-blue rounded-lg opacity-90" />
      </div>

      {/* Step indicator and controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg-elevated border-t border-border z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-text-faint mb-1">
              <span>Step {currentStepIndex + 1} of {steps.length}</span>
              <span>{Math.round(((currentStepIndex + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-bg-sidebar rounded-full h-2">
              <div 
                className="bg-accent-blue h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Current step content */}
          <div className="flex items-center gap-4">
            {/* Exit button */}
            <button
              onClick={handleExit}
              className="px-4 py-2 border border-border rounded-md text-text-primary hover:bg-bg-primary flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Exit
            </button>

            {/* Step content (centered and widest) */}
            <div className="flex-1 text-center">
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {currentStep?.title || `Step ${currentStepIndex + 1}`}
              </h3>
              <p className="text-text-secondary">
                {currentStep?.description || "Processing..."}
              </p>
              {currentStep?.content && (
                <div className="mt-2 text-sm text-text-faint">
                  {currentStep.content}
                </div>
              )}
            </div>

            {/* Continue/Action button */}
            {isWaitingForUser ? (
              <button
                onClick={() => {
                  handleStepAction();
                  handleContinue();
                }}
                className="px-6 py-2 bg-accent-green text-white rounded-md hover:bg-accent-green/80 flex items-center gap-2"
              >
                {currentStep?.actionText || 'Continue'}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : !isLastStep ? (
              <button
                onClick={handleContinue}
                className="px-6 py-2 bg-accent-blue text-white rounded-md hover:bg-accent-blue/80 flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleContinue}
                className="px-6 py-2 bg-accent-green text-white rounded-md hover:bg-accent-green/80 flex items-center gap-2"
              >
                Complete
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Hook for managing guide mode state
export function useGuideMode() {
  const [isGuideMode, setIsGuideMode] = useState(false);
  const [guideSteps, setGuideSteps] = useState([]);
  const [showPrompt, setShowPrompt] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState(null);

  const startGuideMode = (steps) => {
    setGuideSteps(steps);
    setIsGuideMode(true);
    setShowPrompt(false);
    setPendingPrompt(null);
  };

  const exitGuideMode = () => {
    setIsGuideMode(false);
    setGuideSteps([]);
    setShowPrompt(false);
    setPendingPrompt(null);
  };

  const showGuidePrompt = (title, description, steps) => {
    setPendingPrompt({ title, description, steps });
    setShowPrompt(true);
  };

  const acceptGuide = () => {
    if (pendingPrompt) {
      startGuideMode(pendingPrompt.steps);
    }
  };

  const declineGuide = () => {
    setShowPrompt(false);
    setPendingPrompt(null);
  };

  const completeGuide = () => {
    exitGuideMode();
  };

  return {
    isGuideMode,
    guideSteps,
    showPrompt,
    pendingPrompt,
    startGuideMode,
    exitGuideMode,
    showGuidePrompt,
    acceptGuide,
    declineGuide,
    completeGuide
  };
}

// Higher-order component for guide mode
export function withGuideMode(Component) {
  return function GuideModeWrapper(props) {
    const guideState = useGuideMode();

    return (
      <>
        <Component {...props} guideMode={guideState} />
        
        {guideState.showPrompt && (
          <GuideModePrompt
            title={guideState.pendingPrompt?.title}
            description={guideState.pendingPrompt?.description}
            onAccept={guideState.acceptGuide}
            onDecline={guideState.declineGuide}
          />
        )}
        
        {guideState.isGuideMode && (
          <GuideMode
            steps={guideState.guideSteps}
            onComplete={guideState.completeGuide}
            onExit={guideState.exitGuideMode}
          />
        )}
      </>
    );
  };
}
