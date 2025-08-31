import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Box, type BoxType, type Prize } from '../Box'
import userSliceReducer from '@/app/userSlice'

// Mock API
global.fetch = vi.fn()

// Mock translations
vi.mock('../lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'box.red.title': 'Open the red box',
        'box.green.title': 'Open the green box',
        'box.x.title': 'Open the X box',
        'box.opening': 'Opening box...',
        'box.yourPrize': 'Your prize',
        'box.proPrize': `PRO mode for ${params?.days || '3'} days!`,
        'box.energyPrize': `${params?.amount || '0'} Energy!`,
        'box.tapInstruction': 'Tap the box to get your prize!',
        'box.openAction': `Open ${params?.type || 'box'}`,
        'box.error.title': 'Oops! Something went wrong',
        'common.claim': 'Collect',
        'common.close': 'Close',
        'common.retry': 'Retry',
        'common.attemptsLeft': 'attempts left',
      }
      return translations[key] || key
    }
  })
}))

// Mock no-cache API
vi.mock('@/lib/noCacheApi', () => ({
  fetchUserDataNoCache: vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        id: 'test-user',
        coins: 100,
        balance: '1000.00',
        energyTasksBonus: 50
      })
    })
  )
}))

const createTestStore = () => {
  return configureStore({
    reducer: {
      user: userSliceReducer,
    },
    preloadedState: {
      user: {
        id: 'test-user',
        firstName: 'Test',
        lastName: 'User',
        coins: 100,
        balance: '1000.00',
        energyTasksBonus: 50,
        isLoading: false,
        error: null,
      }
    }
  })
}

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={createTestStore()}>
    {children}
  </Provider>
)

describe('Box Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful API response by default
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        prize: { type: 'money', amount: 100, chance: 0.5 },
        energySpent: 10,
        success: true
      })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <TestWrapper>
          <Box type="red" isOpen={false} onClose={() => {}} />
        </TestWrapper>
      )
      
      expect(screen.queryByText('Open the red box')).not.toBeInTheDocument()
    })

    it('should render correctly when isOpen is true', () => {
      render(
        <TestWrapper>
          <Box type="red" isOpen={true} onClose={() => {}} />
        </TestWrapper>
      )
      
      expect(screen.getByText('Open the red box')).toBeInTheDocument()
      expect(screen.getByText('Tap the box to get your prize!')).toBeInTheDocument()
    })

    it('should render different box types correctly', () => {
      const boxTypes: BoxType[] = ['red', 'green', 'x']
      
      boxTypes.forEach(type => {
        const { rerender } = render(
          <TestWrapper>
            <Box type={type} isOpen={true} onClose={() => {}} />
          </TestWrapper>
        )
        
        expect(screen.getByText(`Open the ${type} box`)).toBeInTheDocument()
        
        rerender(
          <TestWrapper>
            <Box type={type} isOpen={false} onClose={() => {}} />
          </TestWrapper>
        )
      })
    })
  })

  describe('Box Opening Functionality', () => {
    it('should show loading state when opening box', async () => {
      render(
        <TestWrapper>
          <Box type="red" isOpen={true} onClose={() => {}} />
        </TestWrapper>
      )

      const boxImage = screen.getByRole('button', { name: /Open the red box/i })
      fireEvent.click(boxImage)

      expect(screen.getByText('Opening box...')).toBeInTheDocument()
    })

    it('should display prize after successful box opening', async () => {
      const mockPrize: Prize = { type: 'money', amount: 500, chance: 0.5 }
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          prize: mockPrize,
          energySpent: 15,
          success: true
        })
      })

      render(
        <TestWrapper>
          <Box type="red" isOpen={true} onClose={() => {}} />
        </TestWrapper>
      )

      const boxImage = screen.getByRole('button', { name: /Open the red box/i })
      
      await act(async () => {
        fireEvent.click(boxImage)
      })

      await waitFor(() => {
        expect(screen.getByText('Your prize')).toBeInTheDocument()
        expect(screen.getByText('$500')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should display PRO prize correctly', async () => {
      const mockPrize: Prize = { type: 'pro', days: 7, chance: 0.1 }
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          prize: mockPrize,
          success: true
        })
      })

      render(
        <TestWrapper>
          <Box type="green" isOpen={true} onClose={() => {}} />
        </TestWrapper>
      )

      const boxImage = screen.getByRole('button', { name: /Open the green box/i })
      
      await act(async () => {
        fireEvent.click(boxImage)
      })

      await waitFor(() => {
        expect(screen.getByText('PRO mode for 7 days!')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Error Handling', () => {
    it('should show error message when API request fails', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      render(
        <TestWrapper>
          <Box type="red" isOpen={true} onClose={() => {}} />
        </TestWrapper>
      )

      const boxImage = screen.getByRole('button', { name: /Open the red box/i })
      
      await act(async () => {
        fireEvent.click(boxImage)
      })

      await waitFor(() => {
        expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should show retry button on error', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Server error'))

      render(
        <TestWrapper>
          <Box type="red" isOpen={true} onClose={() => {}} />
        </TestWrapper>
      )

      const boxImage = screen.getByRole('button', { name: /Open the red box/i })
      
      await act(async () => {
        fireEvent.click(boxImage)
      })

      await waitFor(() => {
        expect(screen.getByText('Retry (3 attempts left)')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should handle invalid prize data gracefully', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          prize: { invalid: 'data' }, // Invalid prize structure
          success: true
        })
      })

      render(
        <TestWrapper>
          <Box type="red" isOpen={true} onClose={() => {}} />
        </TestWrapper>
      )

      const boxImage = screen.getByRole('button', { name: /Open the red box/i })
      
      await act(async () => {
        fireEvent.click(boxImage)
      })

      await waitFor(() => {
        expect(screen.getByText('Invalid prize data received')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('User Interaction', () => {
    it('should call onClose when close button is clicked', () => {
      const mockOnClose = vi.fn()
      
      render(
        <TestWrapper>
          <Box type="red" isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      )

      const closeButton = screen.getByLabelText('Close')
      fireEvent.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <Box type="red" isOpen={true} onClose={() => {}} />
        </TestWrapper>
      )

      const boxImage = screen.getByRole('button', { name: /Open the red box/i })
      
      // Test Enter key
      fireEvent.keyDown(boxImage, { key: 'Enter' })
      expect(screen.getByText('Opening box...')).toBeInTheDocument()
    })

    it('should call onError callback when provided', async () => {
      const mockOnError = vi.fn()
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Test error'))

      render(
        <TestWrapper>
          <Box type="red" isOpen={true} onClose={() => {}} onError={mockOnError} />
        </TestWrapper>
      )

      const boxImage = screen.getByRole('button', { name: /Open the red box/i })
      
      await act(async () => {
        fireEvent.click(boxImage)
      })

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(expect.any(Error))
      }, { timeout: 3000 })
    })
  })

  describe('Retry Functionality', () => {
    it('should allow retry after error', async () => {
      // First call fails
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Server error'))
      
      // Second call succeeds
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          prize: { type: 'money', amount: 100, chance: 0.5 },
          success: true
        })
      })

      render(
        <TestWrapper>
          <Box type="red" isOpen={true} onClose={() => {}} />
        </TestWrapper>
      )

      const boxImage = screen.getByRole('button', { name: /Open the red box/i })
      
      // First attempt fails
      await act(async () => {
        fireEvent.click(boxImage)
      })

      await waitFor(() => {
        expect(screen.getByText('Retry (3 attempts left)')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Retry succeeds
      const retryButton = screen.getByText('Retry (3 attempts left)')
      await act(async () => {
        fireEvent.click(retryButton)
      })

      await waitFor(() => {
        expect(screen.getByText('$100')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should limit retry attempts', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Persistent error'))

      render(
        <TestWrapper>
          <Box type="red" isOpen={true} onClose={() => {}} />
        </TestWrapper>
      )

      const boxImage = screen.getByRole('button', { name: /Open the red box/i })
      
      // First attempt
      await act(async () => {
        fireEvent.click(boxImage)
      })

      await waitFor(() => {
        expect(screen.getByText('Retry (3 attempts left)')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Retry attempts
      for (let i = 2; i >= 1; i--) {
        const retryButton = screen.getByText(`Retry (${i + 1} attempts left)`)
        await act(async () => {
          fireEvent.click(retryButton)
        })

        await waitFor(() => {
          if (i > 1) {
            expect(screen.getByText(`Retry (${i} attempts left)`)).toBeInTheDocument()
          }
        }, { timeout: 3000 })
      }

      // After 3 failed attempts, retry button should be disabled/hidden
      await waitFor(() => {
        expect(screen.queryByText(/Retry/)).not.toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })
})