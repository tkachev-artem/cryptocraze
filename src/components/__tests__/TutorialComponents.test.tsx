/**
 * Basic tests for Tutorial components
 * These tests verify that the components render without crashing
 * and that critical functionality works as expected
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';

// Import the components we want to test
import { Tutorial } from '../../pages/Tutorial';
import TradeTutorial from '../TradeTutorial';
import ProTutorial from '../ProTutorial';

// Mock the tutorial slice
import tutorialReducer from '../../app/tutorialSlice';
import userReducer from '../../app/userSlice';

// Create a test store
const createTestStore = () => configureStore({
  reducer: {
    tutorial: tutorialReducer,
    user: userReducer,
  },
  preloadedState: {
    tutorial: {
      isTradeTutorialActive: false,
      currentStepIndex: 0,
      hasCompletedTradeTutorial: false,
    },
    user: {
      user: {
        id: 'test-user',
        firstName: 'Test',
        lastName: 'User',
        coins: 1000,
        balance: '10000',
        energyTasksBonus: 0,
      },
      isLoading: false,
      error: null,
      notifications: [],
      unreadCount: 0,
    },
  },
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  const store = createTestStore();

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          {children}
        </Provider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Tutorial Components', () => {
  beforeEach(() => {
    // Mock window methods
    Object.defineProperty(window, 'addEventListener', {
      value: jest.fn(),
      writable: true,
    });
    
    Object.defineProperty(window, 'removeEventListener', {
      value: jest.fn(),
      writable: true,
    });

    // Mock ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));

    // Mock querySelector
    document.querySelector = jest.fn().mockReturnValue(null);
    document.querySelectorAll = jest.fn().mockReturnValue([]);
    document.getElementById = jest.fn().mockReturnValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Tutorial Component', () => {
    it('should render loading state initially', () => {
      const { getByText } = render(
        <TestWrapper>
          <Tutorial />
        </TestWrapper>
      );
      
      // Should show loading initially
      expect(getByText(/loading/i)).toBeDefined();
    });
  });

  describe('TradeTutorial Component', () => {
    it('should render without crashing when inactive', () => {
      const { container } = render(
        <TestWrapper>
          <TradeTutorial isActive={false} stepIndex={0} />
        </TestWrapper>
      );
      
      // Should be empty when not active
      expect(container.firstChild).toBeNull();
    });

    it('should render modal when active', () => {
      const { getByRole } = render(
        <TestWrapper>
          <TradeTutorial isActive={true} stepIndex={0} />
        </TestWrapper>
      );
      
      // Should render dialog when active
      expect(getByRole('dialog')).toBeDefined();
    });
  });

  describe('ProTutorial Component', () => {
    const mockProps = {
      isOpen: false,
      currentStep: 1,
      onProceed: jest.fn(),
      onSkip: jest.fn(),
    };

    it('should render nothing when closed', () => {
      const { container } = render(
        <TestWrapper>
          <ProTutorial {...mockProps} />
        </TestWrapper>
      );
      
      // Should be empty when not open
      expect(container.firstChild).toBeNull();
    });

    it('should render modal when open', () => {
      const { getByRole } = render(
        <TestWrapper>
          <ProTutorial {...mockProps} isOpen={true} />
        </TestWrapper>
      );
      
      // Should render dialog when open
      expect(getByRole('dialog')).toBeDefined();
    });
  });
});

describe('Tutorial Utils', () => {
  it('should import tutorial utilities without crashing', async () => {
    const { tutorialLogger, CleanupManager } = await import('../../lib/tutorialUtils');
    
    expect(tutorialLogger).toBeDefined();
    expect(CleanupManager).toBeDefined();
    
    // Test basic logger functionality
    expect(() => {
      tutorialLogger.info('Test message');
      tutorialLogger.warn('Test warning');
      tutorialLogger.error('Test error');
    }).not.toThrow();
  });

  it('should create cleanup manager without errors', async () => {
    const { CleanupManager } = await import('../../lib/tutorialUtils');
    
    const cleanup = new CleanupManager();
    expect(cleanup).toBeDefined();
    
    // Should handle cleanup without errors
    expect(() => {
      cleanup.cleanup();
    }).not.toThrow();
  });
});

describe('Tutorial Types', () => {
  it('should import tutorial types without errors', async () => {
    const { TUTORIAL_CONFIG } = await import('../../types/tutorial');
    
    expect(TUTORIAL_CONFIG).toBeDefined();
    expect(TUTORIAL_CONFIG.Z_INDEX).toBeDefined();
    expect(TUTORIAL_CONFIG.POSITIONING).toBeDefined();
    expect(TUTORIAL_CONFIG.TIMING).toBeDefined();
  });
});