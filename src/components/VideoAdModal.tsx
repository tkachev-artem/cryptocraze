import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '../lib/i18n'
import { adService } from '../services/adService'
import type { AdPlacement, AdWatchResult } from '../services/adService'

// Props interface
interface VideoAdModalProps {
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
}

const VideoAdModal: React.FC<VideoAdModalProps> = ({ 
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
    watchStartTime: null
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const adContainerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

	// Progress animation
	const startProgressAnimation = useCallback(() => {
		console.log('🎯 VideoAdModal: Starting progress animation')
		setState(prev => ({ ...prev, showProgressBar: true, progressPercent: 0 }))
		
		// Animate progress from 0 to 100 over 3 seconds
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
				// Progress completed, increment view count
				setTimeout(() => {
					setState(prev => {
						const newViewCount = prev.viewCount + 1
						console.log(`💰 VideoAdModal: Ad ${newViewCount}/${requiredViews} completed`)
						
						if (newViewCount >= requiredViews) {
							// All ads watched, enable claim button
							return { ...prev, viewCount: newViewCount, canClaim: true }
						} else {
							// More ads to watch, reset for next ad
							return {
								...prev,
								viewCount: newViewCount,
								showProgressBar: false,
								progressPercent: 0,
								canClaim: false
							}
						}
					})
					
					// Auto-start next ad after delay
					if (state.viewCount + 1 < requiredViews) {
						setTimeout(() => {
							startNextAd()
						}, 2000)
					}
				}, 500)
			}
		}
		
		requestAnimationFrame(animate)
	}, [requiredViews, state.viewCount])

	// Загрузка IMA SDK
	const loadImaScript = useCallback(() => {
		if (isImaLoaded) return

		try {
			console.log('🔍 VideoAdModal: Начинаем загрузку IMA SDK')
			
			// Проверяем, не загружен ли уже SDK
			if (window.google?.ima) {
				console.log('✅ VideoAdModal: IMA SDK уже загружен')
				setIsImaLoaded(true)
				setIsReady(true)
				return
			}

			console.log('📥 VideoAdModal: Загружаем IMA SDK...')
			
			// Таймаут для fallback
			const timeout = setTimeout(() => {
				console.log('⏰ VideoAdModal: Таймаут загрузки IMA SDK, используем симуляцию')
				setError(t('video.sdk.timeout'))
				setIsReady(true)
				// Запускаем симуляцию через 1 секунду
				setTimeout(() => {
					setIsStarted(true)
					setTimeout(() => {
						startProgressAnimation()
					}, 3000)
				}, 1000)
			}, 5000) // 5 секунд таймаут
			
			// Создаем script элемент
			const script = document.createElement('script')
			script.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js'
			script.async = true
			
			script.onload = () => {
				console.log('✅ VideoAdModal: IMA SDK загружен успешно')
				clearTimeout(timeout)
				setIsImaLoaded(true)
				setIsReady(true)
			}
			
			script.onerror = () => {
				console.log('❌ VideoAdModal: Ошибка загрузки IMA SDK, используем симуляцию')
				clearTimeout(timeout)
				setError(t('video.sdk.loadError'))
				setIsReady(true)
				// Запускаем симуляцию через 1 секунду
				setTimeout(() => {
					setIsStarted(true)
					setTimeout(() => {
						startProgressAnimation()
					}, 3000)
				}, 1000)
			}
			
			document.head.appendChild(script)
		} catch (err) {
			console.error('❌ VideoAdModal: Ошибка при загрузке IMA SDK:', err)
			setError(t('video.sdk.loadError'))
			setIsReady(true)
			// Запускаем симуляцию через 1 секунду
			setTimeout(() => {
				setIsStarted(true)
				setTimeout(() => {
					startProgressAnimation()
				}, 3000)
			}, 1000)
		}
	}, [isImaLoaded, startProgressAnimation, t])

	// Инициализация IMA
	const initIma = useCallback(() => {
		if (!isImaLoaded || !videoRef.current || !adContainerRef.current) {
			console.log('❌ VideoAdModal: Нет video или adDisplayContainerRef.current, используем симуляцию')
			// Fallback на симуляцию
			setTimeout(() => {
				startProgressAnimation()
			}, 3000)
			return
		}

		try {
			const video = videoRef.current
			const adDisplayContainer = adContainerRef.current

			// Проверяем доступность Google IMA
			if (!window.google?.ima) {
				throw new Error('Google IMA SDK not available')
			}

			// Создаем AdDisplayContainer
			const adDisplayContainerInstance = new window.google.ima.AdDisplayContainer(adDisplayContainer as any, video)
			
			// Создаем AdsLoader
			const adsLoader = new window.google.ima.AdsLoader(adDisplayContainerInstance)
			adsLoaderRef.current = adsLoader

			// Обработчики событий
			adsLoader.addEventListener(window.google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, (event: unknown) => {
				console.log('✅ VideoAdModal: AdsManager загружен')
				if (!window.google?.ima) return
				
				const adsRenderingSettings = new window.google.ima.AdsRenderingSettings()
				adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true

				const adsManagerEvent = event as AdsManagerLoadedEvent
				const adsManager = adsManagerEvent.getAdsManager(video, adDisplayContainer as any, adsRenderingSettings)
				adsManagerRef.current = adsManager

				// Обработчики событий AdsManager
				adsManager.addEventListener(window.google.ima.AdEvent.Type.COMPLETE, () => {
					console.log('✅ VideoAdModal: Реклама завершена')
					startProgressAnimation()
				})

				adsManager.addEventListener(window.google.ima.AdEvent.Type.ALL_ADS_COMPLETED, () => {
					console.log('✅ VideoAdModal: Все рекламы завершены')
					startProgressAnimation()
				})

				adsManager.addEventListener(window.google.ima.AdErrorEvent.Type.AD_ERROR, (adErrorEvent: unknown) => {
					const errorEvent = adErrorEvent as AdErrorEvent
					console.log('❌ VideoAdModal: Ошибка рекламы:', errorEvent.getError())
					setError(t('video.ad.loadError'))
					// Симуляция для тестирования
					setTimeout(() => {
						startProgressAnimation()
					}, 2000)
				})

				// Инициализация
				adsManager.init(video.clientWidth, video.clientHeight, window.google.ima.ViewMode.FULLSCREEN)
				adsManager.start()
			})

			adsLoader.addEventListener(window.google.ima.AdErrorEvent.Type.AD_ERROR, (adErrorEvent: unknown) => {
				const errorEvent = adErrorEvent as AdErrorEvent
				console.log('❌ VideoAdModal: Ошибка загрузки рекламы:', errorEvent.getError())
				setError(t('video.ad.loadError'))
				// Симуляция для тестирования
				setTimeout(() => {
					startProgressAnimation()
				}, 2000)
			})

			// Запрос рекламы
			const adsRequest = new window.google.ima.AdsRequest()
			adsRequest.adTagUrl = adTagUrl
			adsRequest.linearAdSlotWidth = window.innerWidth
			adsRequest.linearAdSlotHeight = window.innerHeight
			adsLoader.requestAds(adsRequest)

		} catch (err) {
			console.error('❌ VideoAdModal: Ошибка инициализации IMA:', err)
			setError(t('video.sdk.initError'))
			// Симуляция для тестирования
			setTimeout(() => {
				startProgressAnimation()
			}, 2000)
		}
	}, [isImaLoaded, adTagUrl, startProgressAnimation, t])

	// Обработчики
	const handleStart = useCallback(() => {
		if (!isReady) return
		
		setIsStarted(true)
		setError(null)
		
		// Попытка инициализации IMA
		if (isImaLoaded) {
			initIma()
		} else {
			// Если IMA не загружен, используем симуляцию
			console.log('🎬 VideoAdModal: Запуск симуляции рекламы')
			setTimeout(() => {
				startProgressAnimation()
			}, 3000)
		}
	}, [isReady, isImaLoaded, initIma, startProgressAnimation])

	// Автоматический запуск рекламы при готовности
	useEffect(() => {
		if (isReady && !isStarted) {
			handleStart()
		}
	}, [isReady, isStarted, handleStart])

	const handleClose = useCallback(() => {
		// Очистка ресурсов
		if (adsManagerRef.current) {
			try {
				adsManagerRef.current.destroy()
			} catch (err) {
				console.log('Ошибка при уничтожении AdsManager:', err)
			}
		}
		
		if (adsLoaderRef.current) {
			try {
				adsLoaderRef.current.destroy()
			} catch (err) {
				console.log('Ошибка при уничтожении AdsLoader:', err)
			}
		}

		// Сброс состояния
		setIsStarted(false)
		setCanClaim(false)
		setViewCount(0)
		setError(null)
		setShowProgressBar(false)
		setProgressPercent(0)
		onClose()
	}, [onClose])

	const handleClaim = useCallback(() => {
		if (!canClaim) return
		
		console.log('💰 VideoAdModal: Награда получена, закрываем модалку')
		handleClose()
	}, [canClaim, handleClose])

	// Блокировка Escape до получения награды
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && !canClaim) {
				e.preventDefault()
				e.stopPropagation()
			}
		}

		if (isOpen && !canClaim) {
			document.addEventListener('keydown', handleKeyDown)
		}

		return () => {
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [isOpen, canClaim])

	// Загрузка IMA SDK при открытии
	useEffect(() => {
		if (isOpen) {
			loadImaScript()
		}
	}, [isOpen, loadImaScript])

	// Очистка при закрытии
	useEffect(() => {
		if (!isOpen) {
			handleClose()
		}
	}, [isOpen, handleClose])

	if (!isOpen) return null

	// Рендер через Portal для полного контроля над позиционированием
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
			{/* Кнопка закрытия вверху */}
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

			{/* Статусная строка */}
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
				{!isReady && t('video.loading')}
				{error && (
					<span style={{ color: '#fca5a5' }}>{error}</span>
				)}
			</div>

			{/* Контейнер рекламы */}
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
				<video 
					ref={videoRef}
					style={{
						width: '100vw',
						height: '100vh',
						objectFit: 'cover'
					}}
					playsInline 
					muted 
				/>
				
				{/* Симуляция рекламы если IMA не работает */}
				{!isImaLoaded && isStarted && (
					<div
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							width: '100vw',
							height: '100vh',
							background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
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

			{/* Прогресс бар после завершения рекламы */}
			{showProgressBar && (
				<div 
					style={{
						position: 'absolute',
						bottom: '140px',
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
								style={{ width: `${String(progressPercent)}%` }}
							/>
						</div>
						<div className="text-white/80 text-center mt-2 text-sm">
							{Math.round(progressPercent)}%
						</div>
					</div>
				</div>
			)}


			{/* Кнопка получения награды */}
			{canClaim && (
				<div 
					style={{
						position: 'absolute',
						bottom: '20px',
						left: '50%',
						transform: 'translateX(-50%)',
						padding: '0 20px',
						width: 'min(320px, 80vw)'
					}}
				>
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
				</div>
			)}

		</div>,
		document.body
	)
}

export default VideoAdModal

