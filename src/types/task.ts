// Task system type definitions

export type TaskState = {
  isActive: boolean;
  isCompleted: boolean;
  isProgressComplete: boolean;
  canClaimReward: boolean;
};

export type TaskCardState = {
  isLoading: boolean;
  isAnimating: boolean;
  isSlidingOut: boolean;
  isSlidingIn: boolean;
  isSimulatingAd: boolean;
  apiError: string | null;
};

export type BoxPosition = {
  position: number;
  icon: string;
  label: string;
  isEnergy?: boolean;
  isRedBox?: boolean;
  isGreenBox?: boolean;
  isXBox?: boolean;
};

export type LevelProgressProps = {
  energyProgress: number;
  onRedBoxClick: () => void;
  onGreenBoxClick: () => void;
  onXBoxClick: () => void;
};

// Re-export task types for convenience
export type { Task, TaskReward, TaskProgress } from '../services/taskService';

export type TaskCardProps = {
  task: Task;
  onComplete: (taskId: string) => Promise<{ wheelResult?: { prize: number; index: number; label: string } }>;
  onUpdateProgress?: (taskId: string, progress: number) => Promise<void>;
  onReplace?: (taskId: string) => Promise<boolean>;
  onWheelOpen?: (taskId: string) => void;
};

// API error types
export type ApiError = {
  message: string;
  code?: string;
  status?: number;
};

// Box types for energy progress component
export type BoxType = 'red' | 'green' | 'x';

// Constants type
export type TaskConstants = {
  readonly PROGRESS_UPDATE_DEBOUNCE_MS: number;
  readonly VIDEO_AD_SIMULATION_DURATION_MS: number;
  readonly LOADING_ANIMATION_DURATION_MS: number;
  readonly SLIDE_OUT_DELAY_MS: number;
  readonly SLIDE_IN_ANIMATION_DURATION_MS: number;
  readonly PERIODIC_UPDATE_INTERVAL_MS: number;
  readonly MAX_ENERGY_DISPLAY: number;
};

export type BoxPositions = {
  readonly ENERGY: number;
  readonly RED_BOX: number;
  readonly GREEN_BOX: number;
  readonly X_BOX: number;
};