import { createSlice, createSelector, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

// Tutorial types
export type TutorialType = 'main' | 'trade' | 'pro';

export type TutorialStepState = 'pending' | 'active' | 'completed' | 'skipped';

export interface BaseTutorialStep {
  id: string | number;
  title: string;
  description?: string;
  content?: string;
  state: TutorialStepState;
  targetSelector?: string;
  eventHandlers?: string[];
  autoTriggers?: string[];
  imageSrc?: string;
  interactive?: boolean;
}

export interface TutorialConfig {
  id: TutorialType;
  isActive: boolean;
  isCompleted: boolean;
  currentStepIndex: number;
  totalSteps: number;
  canSkip: boolean;
  autoStart: boolean;
  storageKey?: string;
}

export interface TutorialState {
  // Active tutorial management
  activeTutorial: TutorialType | null;
  
  // Tutorial configurations
  tutorials: Record<TutorialType, TutorialConfig>;
  
  // Event system
  pendingEvents: string[];
  
  // UI state
  isModalOpen: boolean;
  isLoading: boolean;
  error: string | null;
}

// Storage helpers
const getStorageKey = (type: TutorialType): string => {
  switch (type) {
    case 'main': return 'mainTutorialCompleted';
    case 'trade': return 'tradeTutorialCompleted';  
    case 'pro': return 'proTutorialSeen';
    default: return `${type}TutorialCompleted`;
  }
};

const readCompletionFromStorage = (type: TutorialType): boolean => {
  try {
    const key = getStorageKey(type);
    const value = localStorage.getItem(key);
    return value === 'true';
  } catch {
    return false;
  }
};

const writeCompletionToStorage = (type: TutorialType, completed: boolean) => {
  try {
    const key = getStorageKey(type);
    localStorage.setItem(key, completed ? 'true' : 'false');
  } catch {
    // ignore storage errors
  }
};

// Tutorial step configurations
export const TUTORIAL_STEPS: Record<TutorialType, BaseTutorialStep[]> = {
  main: [
    { id: 'welcome', title: 'tutorial.welcome', content: 'tutorial.pandaIntro', state: 'pending' },
    { id: 'interface', title: 'tutorial.step1.title', content: 'tutorial.step1.content', state: 'pending' },
    { id: 'charts', title: 'tutorial.step2.title', content: 'tutorial.step2.content', state: 'pending' },
    { id: 'trading', title: 'tutorial.step3.title', content: 'tutorial.step3.content', state: 'pending' },
    { id: 'risk', title: 'tutorial.step4.title', content: 'tutorial.step4.content', state: 'pending' },
    { id: 'gamification', title: 'tutorial.step5.title', content: 'tutorial.step5.content', state: 'pending' },
  ],
  
  trade: [
    { id: 1, title: 'tradeTutorial.steps.1.title', description: 'tradeTutorial.steps.1.description', imageSrc: '/tutorial/bear-1.svg', state: 'pending' },
    { id: 2, title: 'tradeTutorial.steps.2.title', description: 'tradeTutorial.steps.2.description', targetSelector: '[data-tutorial-target="wallet-total"], [data-tutorial-target="wallet-free"]', state: 'pending' },
    { id: 3, title: 'tradeTutorial.steps.3.title', description: 'tradeTutorial.steps.3.description', targetSelector: '[data-tutorial-target="pair-selector"]', state: 'pending' },
    { id: 4, title: 'tradeTutorial.steps.4.title', description: 'tradeTutorial.steps.4.description', targetSelector: '[data-tutorial-target="chart-area"]', state: 'pending' },
    { id: 5, title: 'tradeTutorial.steps.5.title', description: 'tradeTutorial.steps.5.description', targetSelector: '[data-tutorial-target="timeframe-selector"], [data-tutorial-target="chart-type-selector"]', state: 'pending' },
    { id: 6, title: 'tradeTutorial.steps.6.title', description: 'tradeTutorial.steps.6.description', targetSelector: '[data-tutorial-target="crypto-info"]', state: 'pending' },
    { id: 7, title: 'tradeTutorial.steps.7.title', description: 'tradeTutorial.steps.7.description', targetSelector: '[data-tutorial-target="sell-button"], [data-tutorial-target="buy-button"]', state: 'pending' },
    { id: 8, title: 'tradeTutorial.steps.8.title', description: 'tradeTutorial.steps.8.description', eventHandlers: ['trade:tutorial:buyOrSell'], state: 'pending' },
    { id: 9, title: 'tradeTutorial.steps.9.title', description: 'tradeTutorial.steps.9.description', autoTriggers: ['trade:tutorial:simulateBuy'], state: 'pending' },
    { id: 10, title: 'tradeTutorial.steps.10.title', description: 'tradeTutorial.steps.10.description', eventHandlers: ['trade:tutorial:editDealOpened'], state: 'pending' },
    { id: 11, title: 'tradeTutorial.steps.11.title', description: 'tradeTutorial.steps.11.description', eventHandlers: ['trade:tutorial:dealInfoOpened'], state: 'pending' },
    { id: 12, title: 'tradeTutorial.steps.12.title', description: 'tradeTutorial.steps.12.description', autoTriggers: ['trade:tutorial:simulateCloseDeal'], state: 'pending' },
  ],
  
  pro: [
    { id: 1, title: 'proTutorial.title', description: 'proTutorial.desc', imageSrc: '/pro-menu/pro-bear.svg', state: 'pending' },
    { id: 2, title: 'proTutorial.applyEMA', description: 'proTutorial.movingAverages', targetSelector: '[data-tutorial-target="fx-element"]', eventHandlers: ['pro:tutorial:fxClicked'], state: 'pending' },
    { id: 3, title: 'proTutorial.applyEMA', description: 'proTutorial.movingAverages', targetSelector: '[data-tutorial-target="ema-indicator"]', autoTriggers: ['pro:tutorial:openFxModal'], eventHandlers: ['pro:tutorial:emaToggled'], state: 'pending' },
    { id: 4, title: 'proTutorial.nextTask', description: '', state: 'pending' },
    { id: 5, title: 'proTutorial.applyIndicator', description: 'proTutorial.rsiIndicator', targetSelector: '[data-tutorial-target="fx-element"]', eventHandlers: ['pro:tutorial:fxClicked'], state: 'pending' },
    { id: 6, title: 'proTutorial.applyIndicator', description: 'proTutorial.rsiIndicator', targetSelector: '[data-tutorial-target="rsi-indicator"]', autoTriggers: ['pro:tutorial:openIndicatorsModal'], eventHandlers: ['pro:tutorial:rsiToggled'], state: 'pending' },
    { id: 7, title: 'proTutorial.nextTask', description: '', state: 'pending' },
    { id: 8, title: 'proTutorial.applyEMA', description: 'proTutorial.smaAverages', targetSelector: '[data-tutorial-target="fx-element"]', eventHandlers: ['pro:tutorial:fxClicked'], state: 'pending' },
    { id: 9, title: 'proTutorial.applyEMA', description: 'proTutorial.smaAverages', targetSelector: '[data-tutorial-target="sma-indicator"]', autoTriggers: ['pro:tutorial:openIndicatorsModal'], eventHandlers: ['pro:tutorial:smaToggled'], state: 'pending' },
    { id: 10, title: 'proTutorial.nextTask', description: '', autoTriggers: ['pro:tutorial:closeIndicatorsModal'], state: 'pending' },
    { id: 11, title: 'proTutorial.addLine', description: '', targetSelector: '[data-tutorial-target="marker-element"]', eventHandlers: ['pro:tutorial:markerClicked'], state: 'pending' },
    { id: 12, title: 'proTutorial.addLine', description: '', targetSelector: '[data-tutorial-target="line-element"]', autoTriggers: ['pro:tutorial:openMarkerModal'], eventHandlers: ['pro:tutorial:lineDrawn'], state: 'pending' },
    { id: 13, title: 'proTutorial.nextTask', description: '', state: 'pending' },
    { id: 14, title: 'markers.tools.area', description: '', targetSelector: '[data-tutorial-target="marker-element"]', eventHandlers: ['pro:tutorial:markerClicked'], state: 'pending' },
    { id: 15, title: 'markers.tools.area', description: '', targetSelector: '[data-tutorial-target="areas-element"]', autoTriggers: ['pro:tutorial:openMarkerModal'], eventHandlers: ['pro:tutorial:areasClicked'], state: 'pending' },
    { id: 16, title: 'markers.tutorial.drawArea', description: '', eventHandlers: ['pro:tutorial:areaDrawn'], state: 'pending' },
    { id: 17, title: 'markers.tutorial.addArrow', description: '', targetSelector: '[data-tutorial-target="marker-element"]', eventHandlers: ['pro:tutorial:markerClicked'], state: 'pending' },
    { id: 18, title: 'markers.tutorial.addArrow', description: '', targetSelector: '[data-tutorial-target="arrow-element"]', autoTriggers: ['pro:tutorial:openMarkerModal'], eventHandlers: ['pro:tutorial:arrowDrawn', 'pro:tutorial:arrowClicked'], state: 'pending' },
    { id: 19, title: 'proTutorial.nextTask', description: '', state: 'pending' },
    { id: 20, title: 'proTutorial.excellent', description: 'proTutorial.timeToPractice', state: 'pending' },
  ]
};

const initialState: TutorialState = {
  activeTutorial: null,
  tutorials: {
    main: {
      id: 'main',
      isActive: false,
      isCompleted: readCompletionFromStorage('main'),
      currentStepIndex: 0,
      totalSteps: TUTORIAL_STEPS.main.length,
      canSkip: true,
      autoStart: false,
    },
    trade: {
      id: 'trade', 
      isActive: false,
      isCompleted: readCompletionFromStorage('trade'),
      currentStepIndex: 0,
      totalSteps: TUTORIAL_STEPS.trade.length,
      canSkip: true,
      autoStart: false,
    },
    pro: {
      id: 'pro',
      isActive: false, 
      isCompleted: readCompletionFromStorage('pro'),
      currentStepIndex: 0,
      totalSteps: TUTORIAL_STEPS.pro.length,
      canSkip: true,
      autoStart: true,
    }
  },
  pendingEvents: [],
  isModalOpen: false,
  isLoading: false,
  error: null,
};

export const newTutorialSlice = createSlice({
  name: 'newTutorial',
  initialState,
  reducers: {
    // Tutorial lifecycle
    startTutorial: (state, action: PayloadAction<TutorialType>) => {
      const type = action.payload;
      const tutorial = state.tutorials[type];
      
      if (tutorial.isCompleted) return;
      
      state.activeTutorial = type;
      tutorial.isActive = true;
      tutorial.currentStepIndex = 0;
      state.isModalOpen = true;
      state.error = null;
    },

    nextStep: (state) => {
      if (!state.activeTutorial) return;
      
      const tutorial = state.tutorials[state.activeTutorial];
      if (tutorial.currentStepIndex < tutorial.totalSteps - 1) {
        tutorial.currentStepIndex += 1;
      }
    },

    prevStep: (state) => {
      if (!state.activeTutorial) return;
      
      const tutorial = state.tutorials[state.activeTutorial];
      if (tutorial.currentStepIndex > 0) {
        tutorial.currentStepIndex -= 1;
      }
    },

    goToStep: (state, action: PayloadAction<number>) => {
      if (!state.activeTutorial) return;
      
      const tutorial = state.tutorials[state.activeTutorial];
      const step = Math.max(0, Math.min(tutorial.totalSteps - 1, action.payload));
      tutorial.currentStepIndex = step;
    },

    skipTutorial: (state) => {
      if (!state.activeTutorial) return;
      
      const tutorial = state.tutorials[state.activeTutorial];
      tutorial.isActive = false;
      tutorial.isCompleted = true;
      writeCompletionToStorage(state.activeTutorial, true);
      
      state.activeTutorial = null;
      state.isModalOpen = false;
    },

    completeTutorial: (state) => {
      if (!state.activeTutorial) return;
      
      const tutorial = state.tutorials[state.activeTutorial];
      tutorial.isActive = false;
      tutorial.isCompleted = true;
      writeCompletionToStorage(state.activeTutorial, true);
      
      state.activeTutorial = null;
      state.isModalOpen = false;
    },

    closeTutorial: (state) => {
      if (!state.activeTutorial) return;
      
      const tutorial = state.tutorials[state.activeTutorial];
      tutorial.isActive = false;
      
      state.activeTutorial = null;
      state.isModalOpen = false;
    },

    // Event handling
    handleTutorialEvent: (state, action: PayloadAction<string>) => {
      const eventName = action.payload;
      
      if (!state.activeTutorial) return;
      
      const tutorial = state.tutorials[state.activeTutorial];
      const currentStep = TUTORIAL_STEPS[state.activeTutorial][tutorial.currentStepIndex];
      
      // Check if this event is expected for current step
      if (currentStep.eventHandlers?.includes(eventName)) {
        // Auto-advance to next step on valid event
        if (tutorial.currentStepIndex < tutorial.totalSteps - 1) {
          tutorial.currentStepIndex += 1;
        } else {
          // Complete tutorial on last step
          tutorial.isActive = false;
          tutorial.isCompleted = true;
          writeCompletionToStorage(state.activeTutorial, true);
          state.activeTutorial = null;
          state.isModalOpen = false;
        }
      }
      
      // Remove processed event from pending
      state.pendingEvents = state.pendingEvents.filter(e => e !== eventName);
    },

    addPendingEvent: (state, action: PayloadAction<string>) => {
      if (!state.pendingEvents.includes(action.payload)) {
        state.pendingEvents.push(action.payload);
      }
    },

    clearPendingEvents: (state) => {
      state.pendingEvents = [];
    },

    // UI state
    setModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isModalOpen = action.payload;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Reset tutorial
    resetTutorial: (state, action: PayloadAction<TutorialType>) => {
      const type = action.payload;
      const tutorial = state.tutorials[type];
      
      tutorial.isActive = false;
      tutorial.isCompleted = false;
      tutorial.currentStepIndex = 0;
      writeCompletionToStorage(type, false);
      
      if (state.activeTutorial === type) {
        state.activeTutorial = null;
        state.isModalOpen = false;
      }
    },
  },
});

export const {
  startTutorial,
  nextStep,
  prevStep,
  goToStep,
  skipTutorial,
  completeTutorial,
  closeTutorial,
  handleTutorialEvent,
  addPendingEvent,
  clearPendingEvents,
  setModalOpen,
  setLoading,
  setError,
  resetTutorial,
} = newTutorialSlice.actions;

// Selectors
export const selectActiveTutorial = (state: RootState) => state.newTutorial.activeTutorial;
export const selectTutorialConfig = (state: RootState, type: TutorialType) => state.newTutorial.tutorials[type];
export const selectCurrentStep = (state: RootState) => {
  const active = state.newTutorial.activeTutorial;
  if (!active) return null;
  
  const tutorial = state.newTutorial.tutorials[active];
  return TUTORIAL_STEPS[active][tutorial.currentStepIndex] || null;
};
export const selectTutorialProgress = createSelector(
  [(state: RootState) => state.newTutorial.activeTutorial, 
   (state: RootState) => state.newTutorial.tutorials],
  (activeTutorial, tutorials) => {
    if (!activeTutorial) return { current: 0, total: 0, percentage: 0 };
    
    const tutorial = tutorials[activeTutorial];
    const current = tutorial.currentStepIndex + 1;
    const total = tutorial.totalSteps;
    const percentage = Math.round((current / total) * 100);
    
    return { current, total, percentage };
  }
);
export const selectIsModalOpen = (state: RootState) => state.newTutorial.isModalOpen;
export const selectIsLoading = (state: RootState) => state.newTutorial.isLoading;
export const selectError = (state: RootState) => state.newTutorial.error;
export const selectPendingEvents = (state: RootState) => state.newTutorial.pendingEvents;

export default newTutorialSlice.reducer;