import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '../lib/i18n'
import { adService } from '../services/adService'
import type { AdPlacement, AdWatchResult, AdError } from '../services/adService'
import { analyticsService } from '../services/analyticsService'

// Props interface
interface EnhancedVideoAdModalProps {
  isOpen: boolean
  onClose: () => void
  onAdCompleted: (result: AdWatchResult) => void
  placement: AdPlacement
  requiredViews?: number // Number of ads required to watch
  rewardAmount?: number // Override default reward amount
}

// Component state interface
interface VideoAdState {
  isReady: boolean
  isStarted: boolean
  isLoading: boolean
  canClaim: boolean
  error: string | null
  viewCount: number
  progressPercent: number
  showProgressBar: boolean
  sessionId: string | null
  watchStartTime: number | null
  adResult: AdWatchResult | null
}

const EnhancedVideoAdModal: React.FC<EnhancedVideoAdModalProps> = ({ 
  isOpen, 
  onClose, 
  onAdCompleted, 
  placement,
  requiredViews = 1,
  rewardAmount 
}) => {
  const { t } = useTranslation()
  
  const [state, setState] = useState<VideoAdState>({
    isReady: false,
    isStarted: false,
    isLoading: false,
    canClaim: false,
    error: null,
    viewCount: 0,
    progressPercent: 0,
    showProgressBar: false,
    sessionId: null,
    watchStartTime: null,
    adResult: null
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const adContainerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const isInitializedRef = useRef(false)

  // Initialize ad service when modal opens
  useEffect(() => {
    if (isOpen && !isInitializedRef.current) {
      initializeAdSystem()
      isInitializedRef.current = true
    }
  }, [isOpen])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetState()
      isInitializedRef.current = false
    }
  }, [isOpen])

  const simulateAdExperience = useCallback(() => {
    console.log('[EnhancedVideoAdModal] Running ad simulation')
    
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null,
      watchStartTime: Date.now()
    }))
    
    // Simulate realistic ad duration
    const adDuration = 15000 + Math.random() * 10000 // 15-25 seconds
    
    setTimeout(() => {
      setState(prev => {
        const newViewCount = prev.viewCount + 1
        const allAdsCompleted = newViewCount >= requiredViews
        
        const mockResult: AdWatchResult = {
          success: true,
          adId: `sim_${Date.now()}`,
          watchTime: adDuration,
          placement,
          reward: {
            type: placement === 'trading_bonus' ? 'trading_bonus' : 'energy',
            amount: rewardAmount || (placement === 'trading_bonus' ? 100 : 5),
            bonusPercentage: placement === 'trading_bonus' ? 5 : undefined
          }
        }
        
        return {
          ...prev,
          isLoading: false,
          viewCount: newViewCount,
          canClaim: allAdsCompleted,
          adResult: mockResult
        }
      })
      
      // Track ad viewing event for analytics
      const adId = `sim_${Date.now()}`
      analyticsService.trackAdWatch(
        adId,
        placement,
        adDuration,
        true, // isSimulation = true
        rewardAmount || (placement === 'trading_bonus' ? 100 : 5)
      )
      
      startProgressAnimation()
    }, adDuration)
  }, [placement, rewardAmount, requiredViews])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
  }, [])

  const startProgressAnimation = useCallback(() => {
    setState(prev => ({ ...prev, showProgressBar: true, progressPercent: 0 }))
    
    const duration = 3000
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const percent = progress * 100
      
      setState(prev => ({ ...prev, progressPercent: percent }))
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        // Animation complete
        setTimeout(() => {
          setState(prev => {
            if (prev.viewCount >= requiredViews) {
              // All ads completed, show claim button
              return { ...prev, showProgressBar: false, canClaim: true }
            } else {
              // More ads needed, prepare for next one
              return {
                ...prev,
                showProgressBar: false,
                progressPercent: 0,
                isStarted: false
              }
            }
          })
        }, 1000)
      }
    }
    
    requestAnimationFrame(animate)
  }, [requiredViews])

  const startNextAd = useCallback(async () => {
    console.log('[EnhancedVideoAdModal] startNextAd called', { isReady: state.isReady, isLoading: state.isLoading })
    if (!state.isReady || state.isLoading) {
      console.log('[EnhancedVideoAdModal] Not ready or loading, skipping')
      return
    }
    
    try {
      setState(prev => ({ 
        ...prev, 
        isLoading: true, 
        isStarted: true, 
        error: null,
        watchStartTime: Date.now()
      }))
      
      // Check if we're in test mode or should use simulation
      if (import.meta.env.VITE_AD_TEST_MODE === 'true') {
        console.log('[EnhancedVideoAdModal] Using simulation mode')
        simulateAdExperience()
      } else {
        // Try to show real ad
        const videoElement = videoRef.current
        const containerElement = adContainerRef.current
        
        if (videoElement && containerElement && adService.isReady()) {
          const result = await adService.showRewardedVideo(placement, videoElement, containerElement)
          
          setState(prev => {
            const newViewCount = prev.viewCount + 1
            const allAdsCompleted = newViewCount >= requiredViews
            
            return {
              ...prev,
              isLoading: false,
              viewCount: newViewCount,
              canClaim: allAdsCompleted,
              adResult: result
            }
          })
          
          if (result.success) {
            startProgressAnimation()
          }
          
        } else {
          // Fallback to simulation
          simulateAdExperience()
        }
      }
      
    } catch (error) {
      console.error('[EnhancedVideoAdModal] Error starting ad:', error)
      
      const errorMessage = error instanceof AdError 
        ? error.message 
        : 'Ad failed to load. Please try again.'
        
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isLoading: false 
      }))
      
      // Try simulation as fallback
      setTimeout(() => {
        simulateAdExperience()
      }, 2000)
    }
  }, [state.isReady, state.isLoading, placement, requiredViews, simulateAdExperience, startProgressAnimation])

  const initializeAdSystem = useCallback(async () => {
    console.log('[EnhancedVideoAdModal] Initializing ad system')
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      // Initialize the ad service
      await adService.initialize(import.meta.env.DEV) // Use test mode in development
      
      setState(prev => ({ ...prev, isReady: true, isLoading: false }))
      
      console.log('[EnhancedVideoAdModal] Ad system initialized, starting ad in 1 second')
      // Auto-start first ad after initialization
      setTimeout(() => {
        console.log('[EnhancedVideoAdModal] Timeout reached, starting ad')
        // Force start ad regardless of isReady state since we just initialized
        forceStartAd()
      }, 1000)
      
    } catch (error) {
      console.error('[EnhancedVideoAdModal] Failed to initialize ad system:', error)
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to initialize ads',
        isLoading: false 
      }))
    }
  }, [])

  // Force start ad without state checks
  const forceStartAd = useCallback(async () => {
    console.log('[EnhancedVideoAdModal] forceStartAd called - bypassing ready check')
    
    try {
      setState(prev => ({ 
        ...prev, 
        isLoading: true, 
        isStarted: true, 
        error: null,
        watchStartTime: Date.now()
      }))
      
      // Check if we're in test mode or should use simulation
      if (import.meta.env.VITE_AD_TEST_MODE === 'true') {
        console.log('[EnhancedVideoAdModal] Using simulation mode')
        simulateAdExperience()
      } else {
        // Try to show real ad
        const videoElement = videoRef.current
        const containerElement = adContainerRef.current
        
        if (videoElement && containerElement && adService.isReady()) {
          const result = await adService.showRewardedVideo(placement, videoElement, containerElement)
          
          setState(prev => {
            const newViewCount = prev.viewCount + 1
            const allAdsCompleted = newViewCount >= requiredViews
            
            return {
              ...prev,
              isLoading: false,
              viewCount: newViewCount,
              canClaim: allAdsCompleted,
              adResult: result
            }
          })
          
          if (result.success) {
            startProgressAnimation()
          }
          
        } else {
          // Fallback to simulation
          simulateAdExperience()
        }
      }
      
    } catch (error) {
      console.error('[EnhancedVideoAdModal] Error in forceStartAd:', error)
      
      const errorMessage = error instanceof AdError 
        ? error.message 
        : 'Ad failed to load. Please try again.'
        
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isLoading: false 
      }))
      
      // Try simulation as fallback
      setTimeout(() => {
        simulateAdExperience()
      }, 2000)
    }
  }, [placement, requiredViews])

  const handleClaim = useCallback(() => {
    if (!state.canClaim || !state.adResult) return
    
    console.log('[EnhancedVideoAdModal] Claiming reward:', state.adResult)
    
    // Call the completion handler with the result
    onAdCompleted(state.adResult)
    
    // Close the modal
    handleClose()
  }, [state.canClaim, state.adResult, onAdCompleted])

  const handleClose = useCallback(() => {
    if (state.isLoading) {
      console.log('[EnhancedVideoAdModal] Cannot close while ad is loading')
      return
    }
    
    resetState()
    onClose()
  }, [state.isLoading, onClose])

  const resetState = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    
    setState({
      isReady: false,
      isStarted: false,
      isLoading: false,
      canClaim: false,
      error: null,
      viewCount: 0,
      progressPercent: 0,
      showProgressBar: false,
      sessionId: null,
      watchStartTime: null,
      adResult: null
    })
  }, [])

  const handleRetry = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
    setTimeout(() => {
      startNextAd()
    }, 500)
  }, [startNextAd])

  if (!isOpen) return null

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'black',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Close button - only show when not loading */}
      {!state.isLoading && (
        <button
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={handleClose}
          aria-label={t('common.close')}
        >
          ×
        </button>
      )}

      {/* Header */}
      <div 
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          color: 'white',
          fontSize: '14px',
          zIndex: 10
        }}
      >
        <div>{t('video.watchAd')} ({state.viewCount}/{requiredViews})</div>
        {state.error && (
          <div style={{ color: '#fca5a5', marginTop: '5px' }}>
            {state.error}
          </div>
        )}
      </div>

      {/* Main content area */}
      <div 
        ref={adContainerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Video element for real ads */}
        <video 
          ref={videoRef}
          style={{
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            display: state.isStarted ? 'block' : 'none'
          }}
          playsInline 
          muted 
        />
        
        {/* Loading state */}
        {state.isLoading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: '#0C54EA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px',
              fontWeight: 'bold',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div>{t('video.loading')}</div>
              <div style={{ fontSize: '16px', marginTop: '10px', opacity: 0.8 }}>
                {state.isReady ? t('video.startingAd') : t('video.initializing')}
              </div>
            </div>
          </div>
        )}

        {/* Ad simulation display */}
        {state.isStarted && !adService.isReady() && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: '#0C54EA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px',
              fontWeight: 'bold'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div>{t('video.testAd')}</div>
              <div style={{ fontSize: '16px', marginTop: '10px' }}>
                {t('video.simulation')}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {state.showProgressBar && (
        <div 
          style={{
            position: 'absolute',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '0 20px',
            width: 'min(320px, 80vw)'
          }}
        >
          <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-white text-center mb-3 font-medium">
              {t('video.processing')}
            </div>
            <div className="w-full bg-white/30 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-[#16a34a] h-full rounded-full transition-all duration-100 ease-out"
                style={{ width: `${state.progressPercent}%` }}
              />
            </div>
            <div className="text-white/80 text-center mt-2 text-sm">
              {Math.round(state.progressPercent)}%
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div 
        style={{
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '0 20px',
          width: 'min(320px, 80vw)'
        }}
      >
        {state.error && !state.isLoading ? (
          <button
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: '#f59e0b',
              color: 'white',
              fontWeight: 'bold',
              borderRadius: '24px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px'
            }}
            onClick={handleRetry}
            aria-label={t('common.retry')}
          >
            {t('common.retry')}
          </button>
        ) : state.canClaim ? (
          <button
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: '#16a34a',
              color: 'white',
              fontWeight: 'bold',
              borderRadius: '24px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px'
            }}
            onClick={handleClaim}
            aria-label={t('video.claimReward')}
          >
            {t('video.claimButton')}
          </button>
        ) : null}
      </div>
    </div>,
    document.body
  )
}

export default EnhancedVideoAdModal