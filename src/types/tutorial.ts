/**
 * Shared tutorial types and configurations
 * This module provides type-safe tutorial state management and configuration
 */

// Tutorial step state machine states
export type TutorialStepState = 'pending' | 'active' | 'completed' | 'error';

// Tutorial positioning preferences
export type TutorialPlacement = 'center' | 'below' | 'above' | 'auto';

// Tutorial configuration constants
export const TUTORIAL_CONFIG = {
  // Z-index values for consistent layering
  Z_INDEX: {
    BACKDROP: 60,
    SPOTLIGHT: 75,
    CONNECTION_LINE: 74,
    MODAL: 90,
    CONTENT: 80,
  },
  
  // Positioning constants
  POSITIONING: {
    TOP_MARGIN: 12,
    LEFT_MARGIN: 14,
    PADDING: 8,
    GAP_DEFAULT: 16,
    VIEWPORT_OFFSET: 8,
  },
  
  // Animation timing
  TIMING: {
    RECALC_INITIAL: 60,
    RECALC_DELAYED: 200,
    FOCUS_DELAY: 100,
    MODAL_TRANSITION: 300,
  },
  
  // Modal dimensions
  MODAL: {
    WIDTH: 'calc(100vw-28px)',
    MAX_WIDTH: 'sm',
    MIN_HEIGHT: 160,
  },
} as const;

// Base tutorial step interface
export interface BaseTutorialStep {
  id: string | number;
  title: string;
  description?: string;
  content?: string;
  state: TutorialStepState;
  targetSelector?: string;
  placement?: TutorialPlacement;
  gap?: number;
  imageSrc?: string;
  interactive?: boolean;
  cta?: string;
  hint?: string;
}

// Tutorial step positioning configuration
export interface StepPositioning {
  selector: string;
  placement: TutorialPlacement;
  gap: number;
}

// Tutorial event types
export type TutorialEventType = 
  | 'step:next'
  | 'step:previous'
  | 'step:skip'
  | 'step:complete'
  | 'step:error'
  | 'tutorial:start'
  | 'tutorial:complete'
  | 'tutorial:skip'
  | 'tutorial:reset';

// Tutorial event payload
export interface TutorialEvent {
  type: TutorialEventType;
  stepId?: string | number;
  error?: Error;
  data?: Record<string, unknown>;
}

// Tutorial state interface
export interface TutorialState {
  isActive: boolean;
  currentStepIndex: number;
  totalSteps: number;
  hasCompleted: boolean;
  error?: Error;
}

// Tutorial error types
export class TutorialError extends Error {
  constructor(
    message: string,
    public readonly stepId?: string | number,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'TutorialError';
  }
}

// Tutorial navigation hook interface
export interface TutorialNavigation {
  canGoNext: boolean;
  canGoPrevious: boolean;
  isFirst: boolean;
  isLast: boolean;
  progress: number;
  goNext: () => void;
  goPrevious: () => void;
  skip: () => void;
  complete: () => void;
  goToStep: (stepIndex: number) => void;
}

// Cleanup function type
export type CleanupFunction = () => void;

// Tutorial positioning result
export interface PositioningResult {
  containerStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  placement: TutorialPlacement;
}

// Tutorial log levels
export type TutorialLogLevel = 'debug' | 'info' | 'warn' | 'error';

// Tutorial logger interface
export interface TutorialLogger {
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, error?: Error, data?: Record<string, unknown>) => void;
}