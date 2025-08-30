import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

export type TutorialName = 'trade';

export type TutorialState = {
  isTradeTutorialActive: boolean;
  currentStepIndex: number; // 0..13
  hasCompletedTradeTutorial: boolean;
};

const LOCAL_STORAGE_KEY = 'tradeTutorialCompleted';

const readCompletionFromStorage = (): boolean => {
  try {
    const value = localStorage.getItem(LOCAL_STORAGE_KEY);
    return value === 'true';
  } catch {
    return false;
  }
};

const writeCompletionToStorage = (completed: boolean) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, completed ? 'true' : 'false');
  } catch {
    // ignore
  }
};

const initialState: TutorialState = {
  isTradeTutorialActive: false,
  currentStepIndex: 0,
  hasCompletedTradeTutorial: readCompletionFromStorage(),
};

export const tutorialSlice = createSlice({
  name: 'tutorial',
  initialState,
  reducers: {
    startTradeTutorial: (state) => {
      if (state.hasCompletedTradeTutorial) return;
      state.isTradeTutorialActive = true;
      state.currentStepIndex = 0;
    },
    nextTradeTutorialStep: (state) => {
      if (!state.isTradeTutorialActive) return;
      if (state.currentStepIndex < 13) {
        state.currentStepIndex += 1;
      }
    },
    prevTradeTutorialStep: (state) => {
      if (!state.isTradeTutorialActive) return;
      if (state.currentStepIndex > 0) {
        state.currentStepIndex -= 1;
      }
    },
    goToTradeTutorialStep: (state, action: PayloadAction<number>) => {
      if (!state.isTradeTutorialActive) return;
      const next = Math.max(0, Math.min(13, action.payload));
      state.currentStepIndex = next;
    },
    skipTradeTutorial: (state) => {
      state.isTradeTutorialActive = false;
      state.currentStepIndex = 0;
    },
    completeTradeTutorial: (state) => {
      state.isTradeTutorialActive = false;
      state.hasCompletedTradeTutorial = true;
      writeCompletionToStorage(true);
    },
    resetTradeTutorialProgress: (state) => {
      state.isTradeTutorialActive = false;
      state.currentStepIndex = 0;
      state.hasCompletedTradeTutorial = false;
      writeCompletionToStorage(false);
    },
  },
});

export const {
  startTradeTutorial,
  nextTradeTutorialStep,
  prevTradeTutorialStep,
  goToTradeTutorialStep,
  skipTradeTutorial,
  completeTradeTutorial,
  resetTradeTutorialProgress,
} = tutorialSlice.actions;

export const selectTradeTutorial = (state: RootState): TutorialState => state.tutorial;
export const selectIsTradeTutorialActive = (state: RootState): boolean => state.tutorial.isTradeTutorialActive;
export const selectCurrentTradeStepIndex = (state: RootState): number => state.tutorial.currentStepIndex;

export default tutorialSlice.reducer;

