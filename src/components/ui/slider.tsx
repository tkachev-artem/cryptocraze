import * as React from "react"
const { useCallback } = React

type SliderProps = {
  value?: number[]
  onValueChange?: (value: number[]) => void
  className?: string
  'aria-label'?: string
}

const allowedPercents = [0, 5, 10, 25, 50, 75, 90, 100]
const positions = Array.from({ length: allowedPercents.length }, (_, i) => (i / (allowedPercents.length - 1)) * 100)

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className = '', value = [0], onValueChange, ...props }, ref) => {
    const [isDragging, setIsDragging] = React.useState(false)
    const sliderRef = React.useRef<HTMLDivElement>(null)

    // Индекс текущего значения
    const currentIdx = Math.max(0, allowedPercents.indexOf(value[0] ?? 0))
    const percent = positions[currentIdx] ?? positions[0]

    // По позиции мыши определяем ближайший индекс, но не даём выбрать 0
    const getNearestIdx = useCallback((clientX: number) => {
      if (!sliderRef.current) return 1
      const rect = sliderRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const width = rect.width
      const rel = Math.max(0, Math.min(1, x / width))
      const idx = Math.round(rel * (allowedPercents.length - 1) - 1e-6)
      return Math.max(1, Math.min(allowedPercents.length - 1, idx))
    }, [])

    const updateValue = useCallback((clientX: number) => {
      const idx = getNearestIdx(clientX)
      onValueChange?.([allowedPercents[idx]])
    }, [getNearestIdx, onValueChange])

    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      updateValue(e.clientX)
    }

    const handleMouseMove = useCallback((e: MouseEvent) => {
      e.preventDefault();
      if (!isDragging) return
      updateValue(e.clientX)
    }, [isDragging, updateValue])

    const handleMouseUp = useCallback(() => {
      setIsDragging(false)
    }, [])

    const handleClick = (e: React.MouseEvent) => {
      if (!isDragging) {
        updateValue(e.clientX)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      let newIdx = currentIdx
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          newIdx = Math.max(1, currentIdx - 1)
          break
        case 'ArrowRight':
        case 'ArrowUp':
          newIdx = Math.min(allowedPercents.length - 1, currentIdx + 1)
          break
        case 'Home':
          newIdx = 1
          break
        case 'End':
          newIdx = allowedPercents.length - 1
          break
        default:
          return
      }
      e.preventDefault()
      onValueChange?.([allowedPercents[newIdx]])
    }

    // Touch-события для мобильных
    const handleTouchStart = (e: React.TouchEvent) => {
      setIsDragging(true)
      updateValue(e.touches[0].clientX)
    }
    const handleTouchMove = useCallback((e: TouchEvent) => {
      e.preventDefault();
      if (!isDragging) return
      updateValue(e.touches[0].clientX)
    }, [isDragging, updateValue])
    const handleTouchEnd = useCallback(() => {
      setIsDragging(false)
    }, [])

    React.useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        document.addEventListener('touchmove', handleTouchMove as unknown as EventListener, { capture: false })
        document.addEventListener('touchend', handleTouchEnd)
        return () => {
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('mouseup', handleMouseUp)
          document.removeEventListener('touchmove', handleTouchMove as unknown as EventListener, { capture: false })
          document.removeEventListener('touchend', handleTouchEnd)
        }
      }
    }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

    return (
      <div className={`relative w-full pb-8 ${className}`} ref={ref} {...props}>
        {/* Дорожка */}
        <div
          ref={sliderRef}
          className="relative w-full h-[5px] bg-transparent rounded-[2.5px] cursor-pointer"
          onMouseDown={handleMouseDown}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onTouchStart={handleTouchStart}
          role="slider"
          aria-label={props['aria-label']}
          aria-valuemin={allowedPercents[0]}
          aria-valuemax={allowedPercents[allowedPercents.length-1]}
          aria-valuenow={allowedPercents[currentIdx]}
          tabIndex={0}
        >
          {/* Выбранная часть */}
          <div
            className="absolute left-0 top-0 h-full bg-[#0C54EA] rounded-[2.5px]"
            style={{ width: `${String(percent)}%`, zIndex: 0 }}
          />
          {/* Невыбранная часть */}
          <div
            className="absolute right-0 top-0 h-full bg-[#0C54EA] opacity-30 rounded-[2.5px]"
            style={{ width: `${String(100 - percent)}%`, zIndex: 0 }}
          />
          {/* Маркеры */}
          <div className="absolute left-0 w-full" style={{ top: 5 }}>
            {allowedPercents.map((_, i) =>
              (i === 0 || i === allowedPercents.length - 1) ? null : (
                <div
                  key={i}
                  className="absolute w-[3px] h-[8px] bg-[#E0E0E0]"
                  style={{ left: `${String((i / (allowedPercents.length - 1)) * 100)}%`, transform: 'translateX(-50%)' }}
                />
              )
            )}
          </div>
          {/* Ползунок */}
          <div
            className="absolute top-1/2 w-[24px] h-[24px] bg-[#0C54EA] rounded-full border-3 border-[#0C54EA] shadow-sm cursor-pointer transition-all duration-150 hover:scale-110"
            style={{
              left: `${String(percent)}%`,
              zIndex: 1,
              transform: currentIdx === allowedPercents.length - 1
                ? 'translateY(-50%) translateX(-100%)'
                : 'translateY(-50%) translateX(-50%)'
            }}
          >
            <div className="absolute top-1/2 left-1/2 w-[6px] h-[6px] bg-white rounded-full transform -translate-y-1/2 -translate-x-1/2" />
          </div>
        </div>
        {/* Проценты */}
        <div className="absolute left-0 w-full" style={{ top: 20 }}>
          {allowedPercents.map((p, i) =>
            (i === 0 || i === allowedPercents.length - 1) ? null : (
              <span
                key={i}
                className="absolute text-xs text-black opacity-50"
                style={{ left: `${String((i / (allowedPercents.length - 1)) * 100)}%`, transform: 'translateX(-50%)' }}
              >{p}%</span>
            )
          )}
        </div>
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
