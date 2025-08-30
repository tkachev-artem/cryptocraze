import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { useAdSense } from '../hooks/useAdSense'

type AdVideoModalProps = {
	isOpen: boolean
	onClose: () => void
	onAdCompleted: () => void
}

/**
 * Модал с встроенным AdSense-блоком. Завершение доступно только после загрузки и отображения объявления.
 */
export const AdVideoModal: React.FC<AdVideoModalProps> = ({ isOpen, onClose, onAdCompleted }) => {
	const { t } = useTranslation();
	const { loadScript, isReady, pushAd } = useAdSense()
	const [adLoaded, setAdLoaded] = useState<boolean>(false)
	const [progressPercent, setProgressPercent] = useState(0)
	const [showProgressBar, setShowProgressBar] = useState(false)
	const containerRef = useRef<HTMLDivElement | null>(null)

	const slot = useMemo(() => (import.meta.env.VITE_ADSENSE_SLOT_VIDEO as string | undefined) ?? '', [])

	// Анимация прогресс-бара
	const startProgressAnimation = useCallback(() => {
		console.log('🎯 AdVideoModal: Запуск анимации прогресса')
		setShowProgressBar(true)
		setProgressPercent(0)
		
		// Анимируем прогресс от 0 до 100 за 3 секунды
		const duration = 3000
		const startTime = Date.now()
		
		const animate = () => {
			const elapsed = Date.now() - startTime
			const progress = Math.min(elapsed / duration, 1)
			const percent = progress * 100
			
			setProgressPercent(percent)
			
			if (progress < 1) {
				requestAnimationFrame(animate)
			} else {
				// Прогресс завершен
				setTimeout(() => {
					setShowProgressBar(false)
				}, 500)
			}
		}
		
		requestAnimationFrame(animate)
	}, [])

	useEffect(() => {
		if (!isOpen) {
			setAdLoaded(false)
			return
		}
		const cancelled = { current: false }
		void (async () => {
			const ok = await loadScript()
			if (!ok || cancelled.current) return
			// Вставляем рекламный блок
			if (containerRef.current) {
				containerRef.current.innerHTML = ''
				const ins = document.createElement('ins')
				ins.className = 'adsbygoogle'
				ins.style.display = 'block'
				ins.setAttribute('data-ad-client', String(import.meta.env.VITE_ADSENSE_CLIENT ?? ''))
				if (slot) ins.setAttribute('data-ad-slot', slot)
				ins.setAttribute('data-ad-format', 'auto')
				ins.setAttribute('data-full-width-responsive', 'true')
				containerRef.current.appendChild(ins)
				// Подписка на факт отрисовки косвенно через задержку
				setTimeout(() => {
					setAdLoaded(true)
					pushAd()
					// Запускаем прогресс-бар после загрузки рекламы
					startProgressAnimation()
				}, 300)
			}
		})()
		return () => {
			cancelled.current = true
		}
	}, [isOpen, loadScript, pushAd, slot, startProgressAnimation])

	const handleClose = useCallback(() => {
		onClose()
	}, [onClose])

	const handleComplete = useCallback(() => {
		if (!adLoaded || showProgressBar) return
		onAdCompleted()
		onClose()
	}, [adLoaded, showProgressBar, onAdCompleted, onClose])

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 z-50">
			<div className="w-full h-full relative p-4 bg-black/50" role="dialog" aria-modal="true" aria-label="Видео реклама">
				<div className="absolute left-1/2 top-12 -translate-x-1/2 w-[min(640px,92vw)] bg-white rounded-2xl p-4 shadow-xl">
					<div className="flex items-center justify-between mb-2">
						        <h3 className="text-lg font-bold text-black">{t('ui.ads.title')}</h3>
						<button
							className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
							onClick={handleClose}
							aria-label="Закрыть"
						>
							<span className="text-xl leading-none">×</span>
						</button>
					</div>

					<div ref={containerRef} className="w-full min-h-[180px] flex items-center justify-center bg-gray-50 rounded-lg">
						{!isReady && (
							            <div className="text-sm text-gray-500">{t('ui.ads.loading')}</div>
						)}
					</div>

					{/* Прогресс бар */}
					{showProgressBar && (
						<div className="mt-4">
							            <div className="text-center mb-2 text-sm text-gray-600">
              {t('ui.ads.processing')}
            </div>
							<div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
								<div 
									className="bg-[#0C54EA] h-full rounded-full transition-all duration-100 ease-out"
									style={{ width: `${String(progressPercent)}%` }}
								/>
							</div>
							<div className="text-center mt-2 text-xs text-gray-500">
								{Math.round(progressPercent)}%
							</div>
						</div>
					)}

					<div className="mt-6 flex gap-2">
						<button
							className="flex-1 h-[44px] bg-[#0C54EA] hover:bg-[#0A4BC8] text-white font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={!adLoaded || showProgressBar}
							onClick={handleComplete}
							aria-label="Получить награду"
						>
							            {t('ui.ads.getReward')}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

export default AdVideoModal

