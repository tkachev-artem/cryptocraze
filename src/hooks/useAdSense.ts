import { useCallback, useEffect, useRef, useState } from 'react'

declare global {
	interface Window {
		adsbygoogle?: unknown[]
	}
}

type UseAdSenseResult = {
	loadScript: () => Promise<boolean>
	isReady: boolean
	pushAd: () => void
}

/**
 * Грузит скрипт AdSense один раз и предоставляет утилиты для показа блока.
 * Ожидает наличие переменных окружения VITE_ADSENSE_CLIENT и VITE_ADSENSE_SLOT_VIDEO.
 */
export const useAdSense = (): UseAdSenseResult => {
	const [isReady, setIsReady] = useState<boolean>(false)
	const loadingRef = useRef<boolean>(false)
	const loadedRef = useRef<boolean>(false)

	const loadScript = useCallback(async (): Promise<boolean> => {
		if (loadedRef.current) return true
		if (loadingRef.current) return isReady

		const clientId = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined
		if (!clientId) {
			// Без client id не сможем корректно инициализировать AdSense
			return false
		}

		loadingRef.current = true
		return new Promise<boolean>((resolve) => {
			// Проверим, не подключен ли уже скрипт
			const existing = document.querySelector<HTMLScriptElement>('script[data-adsense-script="true"]')
			if (existing) {
				loadedRef.current = true
				setIsReady(true)
				resolve(true)
				return
			}

			const script = document.createElement('script')
			script.async = true
			script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`
			script.setAttribute('crossorigin', 'anonymous')
			script.setAttribute('data-adsense-script', 'true')
			script.onload = () => {
				loadedRef.current = true
				setIsReady(true)
				resolve(true)
			}
			script.onerror = () => {
				loadedRef.current = false
				setIsReady(false)
				resolve(false)
			}
			document.head.appendChild(script)
		})
	}, [isReady])

	useEffect(() => {
		// По желанию можно автозагрузить, но оставим лениво по вызову loadScript
		// Empty effect for future functionality
	}, [])

	const pushAd = useCallback(() => {
		try {
			window.adsbygoogle ??= [];
			const adsbygoogle = window.adsbygoogle as unknown[];
			adsbygoogle.push({});
		} catch {
			// Silently handle AdSense loading errors
		}
	}, [])

	return { loadScript, isReady, pushAd }
}

export default useAdSense

