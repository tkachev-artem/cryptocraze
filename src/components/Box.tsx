import { useState, useEffect, useCallback, useRef } from 'react'
import { API_BASE_URL } from '@/lib/api'
import { useAppDispatch } from '@/app/hooks'
import { forceUserUpdate } from '@/app/userSlice'
import { fetchUserDataNoCache } from '@/lib/noCacheApi'
import { useTranslation } from '../lib/i18n'
import { ErrorBoundary } from './ErrorBoundary'
import { Grid } from './ui/grid'
import { Button } from './ui/button'

// Enhanced TypeScript types
export type BoxType = 'red' | 'green' | 'x'

export interface Prize {
  amount?: number
  type?: 'pro' | 'money' | 'energy'
  days?: number
  chance: number
  energySpent?: number
}

export interface BoxOpenResponse {
  prize: Prize
  energySpent?: number
  success: boolean
  message?: string
}

export interface BoxState {
  isOpening: boolean
  isAnimating: boolean
  prize: Prize | null
  error: string | null
  retryCount: number
}

export interface BoxConfig {
  closeImage: string
  openImage: string
  title: string
  gradient: string
}

interface BoxProps {
  type: BoxType
  isOpen: boolean
  onClose: () => void
  onError?: (error: Error) => void
}

// Style constants - extracted from hardcoded values
const STYLES = {
  gradients: {
    main: 'radial-gradient(197.89% 49.47% at 50% 50%, #422982 0%, #25094F 100%), #FFF',
    success: 'radial-gradient(197.89% 49.47% at 50% 50%, #1a5f1a 0%, #0d2f0d 100%), #FFF',
    error: 'radial-gradient(197.89% 49.47% at 50% 50%, #8b2635 0%, #4a1319 100%), #FFF'
  },
  dimensions: {
    boxImage: { width: 208, height: 240 }, // w-52 h-60
    buttonHeight: 48
  },
  timing: {
    openingAnimation: 800, // Уменьшили с 1500 до 800мс для более быстрой тряски
    prizeReveal: 400, // Уменьшили с 800 до 400мс
    retryDelay: 1000
  },
  colors: {
    prize: '#F5A600',
    white: '#FFFFFF',
    button: '#0C54EA',
    buttonHover: '#0A4BD8'
  }
} as const

// Prize validation utility
const validatePrize = (prize: unknown): Prize | null => {
  if (!prize || typeof prize !== 'object') return null
  
  const p = prize as Record<string, unknown>
  
  // Check required fields
  if (typeof p.chance !== 'number') return null
  
  // Validate prize types
  if (p.type && !['pro', 'money', 'energy'].includes(String(p.type))) return null
  
  return {
    amount: typeof p.amount === 'number' ? p.amount : undefined,
    type: p.type as Prize['type'],
    days: typeof p.days === 'number' ? p.days : undefined,
    chance: p.chance as number,
    energySpent: typeof p.energySpent === 'number' ? p.energySpent : undefined
  }
}

// Custom hook for box opening logic
const useBoxOpening = (type: BoxType) => {
  const dispatch = useAppDispatch()
  const [state, setState] = useState<BoxState>({
    isOpening: false,
    isAnimating: false,
    prize: null,
    error: null,
    retryCount: 0
  })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const forceUpdateUser = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[Box] Updating user data after box opening')
      const response = await fetchUserDataNoCache()
      
      if (!response.ok) {
        throw new Error(`Failed to update user: ${response.status}`)
      }
      
      const userData = await response.json()
      
      // Validate user data before dispatching
      if (!userData || typeof userData !== 'object') {
        throw new Error('Invalid user data received')
      }
      
      dispatch(forceUserUpdate(userData))
      console.log('[Box] User data updated successfully:', {
        coins: userData.coins,
        balance: userData.balance,
        energy: userData.energyTasksBonus
      })
      return true
    } catch (error) {
      console.error('[Box] Failed to update user data:', error)
      return false
    }
  }, [dispatch])

  const openBox = useCallback(async (): Promise<void> => {
    if (state.isOpening) return

    // Cancel any existing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    
    setState(prev => ({ ...prev, isOpening: true, isAnimating: true, error: null }))

    try {
      // Animation delay with loading state
      await new Promise(resolve => {
        timeoutRef.current = setTimeout(resolve, STYLES.timing.openingAnimation)
      })

      const endpoint = `${API_BASE_URL}/${String(type)}-box/open`
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        let errorMessage = 'Failed to open box'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json() as BoxOpenResponse
      
      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response from server')
      }

      const validatedPrize = validatePrize(data.prize)
      if (!validatedPrize) {
        throw new Error('Invalid prize data received')
      }

      // Add energy spent to prize if available
      if (data.energySpent) {
        validatedPrize.energySpent = data.energySpent
      }

      setState(prev => ({ 
        ...prev, 
        prize: validatedPrize, 
        isAnimating: false,
        retryCount: 0 // Reset retry count on success
      }))

      // Update user data after successful box opening
      await forceUpdateUser()

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[Box] Request was cancelled')
        return
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('[Box] Failed to open box:', errorMessage)
      
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isAnimating: false,
        retryCount: prev.retryCount + 1
      }))
    } finally {
      setState(prev => ({ ...prev, isOpening: false }))
    }
  }, [type, state.isOpening, forceUpdateUser])

  const retry = useCallback(async () => {
    if (state.retryCount >= 3) return
    
    setState(prev => ({ ...prev, error: null }))
    
    // Small delay before retry
    await new Promise(resolve => setTimeout(resolve, STYLES.timing.retryDelay))
    await openBox()
  }, [openBox, state.retryCount])

  const closePrize = useCallback(async () => {
    setState(prev => ({ ...prev, prize: null, error: null, retryCount: 0 }))
    await forceUpdateUser()
  }, [forceUpdateUser])

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setState({
      isOpening: false,
      isAnimating: false,
      prize: null,
      error: null,
      retryCount: 0
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return { state, openBox, retry, closePrize, reset }
}

export const Box = ({ type, isOpen, onClose, onError }: BoxProps) => {
  const { t } = useTranslation()
  const { state, openBox, retry, closePrize, reset } = useBoxOpening(type)
  const isPrizeOpen = Boolean(state.prize)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen && !isPrizeOpen) {
      reset()
    }
  }, [isOpen, isPrizeOpen, reset])

  // Call error handler if provided
  useEffect(() => {
    if (state.error && onError) {
      onError(new Error(state.error))
    }
  }, [state.error, onError])

  // Handle box close with proper cleanup
  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  const handleClosePrize = useCallback(async () => {
    await closePrize()
    onClose()
  }, [closePrize, onClose])

  if (!isOpen && !isPrizeOpen) return null

  // Box configuration with enhanced styling
  const boxConfig: Record<BoxType, BoxConfig> = {
    red: { 
      closeImage: '/boxes/red-box/close/box.svg', 
      openImage: '/boxes/red-box/open/open-box.svg', 
      title: t('box.red.title'),
      gradient: STYLES.gradients.main
    },
    green: { 
      closeImage: '/boxes/green-box/close/box.svg', 
      openImage: '/boxes/green-box/open/open-box.svg', 
      title: t('box.green.title'),
      gradient: STYLES.gradients.main
    },
    x: { 
      closeImage: '/boxes/x-box/close/box.svg', 
      openImage: '/boxes/x-box/open/open-box.svg', 
      title: t('box.x.title'),
      gradient: STYLES.gradients.main
    },
  } as const

  const cfg = boxConfig[type]

  // Render prize display with proper validation
  const renderPrizeText = (prize: Prize): string => {
    if (prize.type === 'pro') {
      return t('box.proPrize', { days: String(prize.days ?? 3) })
    }
    if (prize.type === 'energy') {
      return t('box.energyPrize', { amount: String(prize.amount ?? 0) })
    }
    return `$${String(prize.amount ?? 0)}`
  }

  // Prize modal with error boundary
  if (isPrizeOpen && state.prize) {
    return (
      <div className="fixed inset-0 z-50">
        <Grid className="p-0">
          <ErrorBoundary
            onError={(error) => {
              console.error('[Box] Prize display error:', error)
              onError?.(error)
            }}
            resetKeys={[state.prize]}
          >
            <div
              className="w-full h-dvh relative p-4"
              style={{ background: STYLES.gradients.success }}
            >
            <div className="absolute top-[80px] left-1/2 transform -translate-x-1/2 text-center">
              <h2 
                className="text-white text-[29px] font-bold mb-4"
                style={{ color: STYLES.colors.white }}
              >
                {t('box.yourPrize')}
              </h2>
              <p 
                className="text-[40px] font-extrabold animate-pulse"
                style={{ color: STYLES.colors.prize }}
              >
                {renderPrizeText(state.prize)}
              </p>
            </div>
            <div className="w-full h-full flex flex-col items-center justify-center">
              <img 
                src={cfg.openImage} 
                alt="Opened Box" 
                className="transition-all duration-500 hover:scale-105"
                style={{ 
                  width: STYLES.dimensions.boxImage.width, 
                  height: STYLES.dimensions.boxImage.height 
                }}
                onError={(e) => {
                  console.error('[Box] Prize image failed to load:', cfg.openImage)
                  e.currentTarget.src = '/boxes/fallback-box.svg' // Fallback image
                }}
              />
            </div>
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full px-4">
              <Button
                onClick={() => void handleClosePrize()}
                className="w-full font-bold transition-all duration-200 hover:scale-105"
                style={{ 
                  height: STYLES.dimensions.buttonHeight,
                  backgroundColor: STYLES.colors.button
                }}
              >
                {t('common.claim')}
              </Button>
            </div>
          </div>
          </ErrorBoundary>
        </Grid>
      </div>
    )
  }

  // Error display component
  const renderError = () => {
    if (!state.error) return null
    
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
        <div className="bg-red-900/20 border border-red-400 rounded-lg p-6 max-w-sm mx-auto text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-white font-bold mb-2">{t('box.error.title')}</h3>
          <p className="text-gray-300 text-sm mb-4">{state.error}</p>
          <div className="space-y-2">
            {state.retryCount < 3 && (
              <Button
                onClick={retry}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={state.isOpening}
              >
                {t('common.retry')} ({3 - state.retryCount} {t('common.attemptsLeft')})
              </Button>
            )}
            <Button
              onClick={handleClose}
              className="w-full"
              variant="outline"
            >
              {t('common.close')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Box modal with comprehensive error handling
  if (isOpen) {
    const backgroundStyle = state.error ? STYLES.gradients.error : cfg.gradient
    
    return (
      <div className="fixed inset-0 z-50">
        <Grid className="p-0">
          <ErrorBoundary
            onError={(error) => {
              console.error('[Box] Component error:', error)
              onError?.(error)
            }}
            resetKeys={[type, isOpen]}
          >
            <div
              className="w-full h-dvh flex flex-col items-center justify-center p-4 relative"
              style={{ background: backgroundStyle }}
            >
            {/* Main box interaction area */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
              {!state.error && (
                <>
                  <div
                    className={`cursor-pointer transition-all duration-300 ${
                      state.isOpening 
                        ? 'animate-shake' 
                        : 'hover:scale-105 active:scale-95'
                    }`}
                    onClick={state.isOpening || state.error ? undefined : openBox}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        if (!state.isOpening && !state.error) {
                          void openBox()
                        }
                      }
                    }}
                    aria-label={t('box.openAction', { type: cfg.title })}
                  >
                    <img 
                      src={cfg.closeImage} 
                      alt={`${type} box`}
                      className="mb-6"
                      style={{ 
                        width: STYLES.dimensions.boxImage.width, 
                        height: STYLES.dimensions.boxImage.height 
                      }}
                      onError={(e) => {
                        console.error('[Box] Box image failed to load:', cfg.closeImage)
                        e.currentTarget.src = '/boxes/fallback-box.svg' // Fallback image
                      }}
                    />
                  </div>
                  
                  {!state.isOpening && !state.isAnimating && (
                    <>
                      <h2 
                        className="text-white text-3xl font-bold mb-4 text-center"
                        style={{ color: STYLES.colors.white }}
                      >
                        {cfg.title}
                      </h2>
                      <p 
                        className="text-white text-lg opacity-80 text-center max-w-sm"
                        style={{ color: STYLES.colors.white }}
                      >
                        {t('box.tapInstruction')}
                      </p>
                    </>
                  )}
                </>
              )}
              
              {/* Loading states overlay - REMOVED */}
              
              {/* Error display overlay */}
              {renderError()}
            </div>
            
            {/* Close button */}
            {!state.isOpening && (
              <div className="absolute top-4 right-4">
                <Button
                  onClick={handleClose}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  aria-label={t('common.close')}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            )}
            </div>
          </ErrorBoundary>
        </Grid>
      </div>
    )
  }

  return null
}