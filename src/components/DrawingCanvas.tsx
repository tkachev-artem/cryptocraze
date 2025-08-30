import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import type { DrawingTool, DrawingMode, DrawingObject } from '@/types/drawing';

type DrawingCanvasProps = {
  chart: IChartApi | null;
  series: ISeriesApi<'Line'> | ISeriesApi<'Candlestick'> | ISeriesApi<'Bar'> | null;
  activeTool: DrawingTool;
  drawingMode: DrawingMode;
  drawingObjects: DrawingObject[];
  onAddDrawingObject: (object: DrawingObject) => void;
  onRemoveDrawingObject: (id: string) => void;
  containerWidth: number;
  containerHeight: number;
  selectedObjectId?: string | null;
  onSelectObject?: (id: string | null) => void;
  onTextPlacementRequest?: (position: { x: number; y: number; price: number; time: number; logical?: number }) => void;
};

export type DrawingCanvasHandle = {
  getCanvas: () => HTMLCanvasElement | null;
};

type Point = {
  x: number;
  y: number;
  price: number;
  time: number;
  logical?: number;
};

const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(({
  chart,
  series,
  activeTool,
  drawingMode,
  drawingObjects,
  onAddDrawingObject,
  onRemoveDrawingObject,
  containerWidth,
  containerHeight,
  onSelectObject,
  onTextPlacementRequest
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);

  // Expose the canvas element through ref
  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current
  }), []);

  // Конвертация координат
  const pixelToPoint = useCallback((x: number, y: number): Point => {
    if (!chart || !series) {
      console.warn('DrawingCanvas: chart or series not available');
      return { x, y, price: 0, time: Date.now() / 1000 };
    }

    const price = series.coordinateToPrice(y) ?? 0;
    const timeScale = chart.timeScale();
    const logical = timeScale.coordinateToLogical(x);
    const time = Math.floor(Date.now() / 1000);

// debug: pixelToPoint

    const result = {
      x,
      y,
      price: typeof price === 'number' ? price : 0,
      time,
      logical: typeof logical === 'number' ? logical : undefined
    };
    
    return result;
  }, [chart, series]);



  // Настройка canvas
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = `${String(containerWidth)}px`;
    canvas.style.height = `${String(containerHeight)}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [containerWidth, containerHeight]);

  // Отрисовка отдельного объекта
  const drawObject = useCallback((ctx: CanvasRenderingContext2D, obj: DrawingObject, isHovered = false) => {
    const color = isHovered ? '#FF6B35' : '#0C54EA';
    const width = isHovered ? 2 : 1.5;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;

    switch (obj.type) {
      case 'horizontalLine': {
        // Для горизонтальной линии используем только цену, время не важно
        const y = series?.priceToCoordinate(obj.price);

        if (typeof y === 'number') {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(containerWidth, y);
          ctx.stroke();
          
          // Подпись цены ниже линии с более заметным фоном
          const priceText = `$${obj.price.toFixed(2)}`;
          ctx.font = '12px Nunito, sans-serif';
          ctx.textAlign = 'left';
          const textMetrics = ctx.measureText(priceText);
          const textWidth = textMetrics.width;
          const padding = 6;
          
          // Голубой фон для цены
          ctx.fillStyle = '#F1F7FF';
          ctx.fillRect(containerWidth - textWidth - padding * 2 - 10, y + 5, textWidth + padding * 2, 22);
          
          // Текст цены
          ctx.fillStyle = '#0C46BE';
          ctx.font = '500 12px Nunito, sans-serif';
          ctx.fillText(priceText, containerWidth - textWidth - padding - 10, y + 18);
        }
        break;
      }
      case 'verticalLine': {
        // Для вертикальной линии используем логическую позицию, если есть
        const timeScale = chart?.timeScale();
        let x: number | null = null;
        if (obj.logical != null && timeScale) {
          x = timeScale.logicalToCoordinate(obj.logical as never) ?? null;
        }
        if (x == null && timeScale) {
          x = timeScale.timeToCoordinate(obj.timestamp as Time) ?? null;
        }
        x ??= obj.pixelX ?? null;

        // debug: verticalLine

        if (typeof x === 'number') {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, containerHeight);
          ctx.stroke();
        }
        break;
      }
      case 'line': {
        const timeScale = chart?.timeScale();
        const startX = obj.startLogical != null && timeScale
          ? timeScale.logicalToCoordinate(obj.startLogical as never)
          : timeScale?.timeToCoordinate(obj.startX as Time);
        const startY = series?.priceToCoordinate(obj.startY);
        const endX = obj.endLogical != null && timeScale
          ? timeScale.logicalToCoordinate(obj.endLogical as never)
          : timeScale?.timeToCoordinate(obj.endX as Time);
        const endY = series?.priceToCoordinate(obj.endY);
        
        const willDraw = (typeof startX === 'number' && typeof startY === 'number' && 
                         typeof endX === 'number' && typeof endY === 'number');
        const isZeroLength = startX === endX && startY === endY;
        
        // debug: line
        
        if (willDraw && !isZeroLength) {
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
        break;
      }
      case 'arrow': {
        const timeScale = chart?.timeScale();
        const startX = obj.startLogical != null && timeScale
          ? timeScale.logicalToCoordinate(obj.startLogical as never)
          : timeScale?.timeToCoordinate(obj.startX as Time);
        const startY = series?.priceToCoordinate(obj.startY);
        const endX = obj.endLogical != null && timeScale
          ? timeScale.logicalToCoordinate(obj.endLogical as never)
          : timeScale?.timeToCoordinate(obj.endX as Time);
        const endY = series?.priceToCoordinate(obj.endY);
        
        const willDraw = (typeof startX === 'number' && typeof startY === 'number' && 
                         typeof endX === 'number' && typeof endY === 'number');
        const isZeroLength = startX === endX && startY === endY;
        
        // debug: arrow
        
        if (willDraw && !isZeroLength) {
          // Линия
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          
          // Стрелка
          const angle = Math.atan2(endY - startY, endX - startX);
          const headLength = 12;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headLength * Math.cos(angle - Math.PI / 6),
            endY - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headLength * Math.cos(angle + Math.PI / 6),
            endY - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
        break;
      }
      case 'area': {
        const timeScale = chart?.timeScale();
        const startX = obj.startLogical != null && timeScale
          ? timeScale.logicalToCoordinate(obj.startLogical as never)
          : timeScale?.timeToCoordinate(obj.startX as Time);
        const startY = series?.priceToCoordinate(obj.startY);
        const endX = obj.endLogical != null && timeScale
          ? timeScale.logicalToCoordinate(obj.endLogical as never)
          : timeScale?.timeToCoordinate(obj.endX as Time);
        const endY = series?.priceToCoordinate(obj.endY);
        
        const willDraw = (typeof startX === 'number' && typeof startY === 'number' && 
                         typeof endX === 'number' && typeof endY === 'number');
        const isZeroLength = startX === endX && startY === endY;
        
        // debug: area
        
        if (willDraw && !isZeroLength) {
          const x = Math.min(startX, endX);
          const y = Math.min(startY, endY);
          const w = Math.abs(endX - startX);
          const h = Math.abs(endY - startY);
          
          ctx.fillStyle = 'rgba(12, 84, 234, 0.1)';
          ctx.fillRect(x, y, w, h);
          // Убрали обводку: ctx.strokeRect(x, y, w, h);
        }
        break;
      }
      case 'text': {
        const timeScale = chart?.timeScale();
        const x = obj.logical != null && timeScale
          ? timeScale.logicalToCoordinate(obj.logical as never)
          : timeScale?.timeToCoordinate(obj.x as Time);
        const y = series?.priceToCoordinate(obj.y);
        
        const willDraw = (typeof x === 'number' && typeof y === 'number');
        
        if (willDraw) {
          const fontSize = obj.fontSize ?? 12;
          ctx.font = `${String(fontSize)}px Nunito, sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          
          const metrics = ctx.measureText(obj.text);
          const padding = 6;
          const textWidth = metrics.width;
          const textHeight = fontSize * 1.2; // Приблизительная высота текста
          
          // Фон
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.fillRect(
            x - padding,
            y - textHeight / 2 - padding,
            textWidth + padding * 2,
            textHeight + padding * 2
          );
          
          // Текст
          ctx.fillStyle = color;
          ctx.fillText(obj.text, x, y);
        }
        break;
      }
    }
  }, [chart, series, containerWidth, containerHeight]);

  // Предварительный просмотр
  const drawPreview = useCallback((ctx: CanvasRenderingContext2D, tool: DrawingTool, start: Point, current: Point) => {
    ctx.strokeStyle = 'rgba(12, 84, 234, 0.7)';
    ctx.fillStyle = 'rgba(12, 84, 234, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);

    switch (tool) {
      case 'horizontalLine':
        ctx.beginPath();
        ctx.moveTo(0, start.y);
        ctx.lineTo(containerWidth, start.y);
        ctx.stroke();
        break;
      case 'verticalLine':
        ctx.beginPath();
        ctx.moveTo(start.x, 0);
        ctx.lineTo(start.x, containerHeight);
        ctx.stroke();
        break;
      case 'line':
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(current.x, current.y);
        ctx.stroke();
        break;
      case 'arrow': {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(current.x, current.y);
        ctx.stroke();
        
        const angle = Math.atan2(current.y - start.y, current.x - start.x);
        const headLength = 10;
        ctx.beginPath();
        ctx.moveTo(current.x, current.y);
        ctx.lineTo(
          current.x - headLength * Math.cos(angle - Math.PI / 6),
          current.y - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(current.x, current.y);
        ctx.lineTo(
          current.x - headLength * Math.cos(angle + Math.PI / 6),
          current.y - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
        break;
      }
      case 'area': {
        const x = Math.min(start.x, current.x);
        const y = Math.min(start.y, current.y);
        const w = Math.abs(current.x - start.x);
        const h = Math.abs(current.y - start.y);
        
        ctx.fillStyle = 'rgba(12, 84, 234, 0.1)';
        ctx.fillRect(x, y, w, h);
        // Убрали обводку: ctx.strokeRect(x, y, w, h);
        break;
      }
    }

    ctx.setLineDash([]);
  }, [containerWidth, containerHeight]);

  // Отрисовка всех объектов
  const drawAllObjects = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !chart || !series) {
    // skip draw - missing deps
      return;
    }

    ctx.clearRect(0, 0, containerWidth, containerHeight);

    // debug: frame

    // Рисуем сохраненные объекты
    drawingObjects.forEach(obj => {
      try {
        const isHovered = hoveredObjectId === obj.id;
        drawObject(ctx, obj, isHovered);
      } catch (error) {
        console.error('Error drawing object:', obj, error);
      }
    });

    // Рисуем предварительный просмотр
    if (isDrawing && startPoint && currentPoint && activeTool !== 'none') {
      drawPreview(ctx, activeTool, startPoint, currentPoint);
    }
  }, [chart, series, containerWidth, containerHeight, drawingObjects, hoveredObjectId, drawObject, isDrawing, startPoint, currentPoint, activeTool, drawPreview]);

  // Проверка попадания в объект
  const getObjectAtPoint = useCallback((x: number, y: number): string | null => {
    const timeScale = chart?.timeScale();
    for (const obj of [...drawingObjects].reverse()) {
      switch (obj.type) {
        case 'horizontalLine': {
          const yy = series?.priceToCoordinate(obj.price);
          if (typeof yy === 'number' && Math.abs(y - yy) < 5) return obj.id;
          break;
        }
        case 'verticalLine': {
          const verticalObj = obj as DrawingObject & { type: 'verticalLine' };
          const xx = verticalObj.logical != null && timeScale
            ? timeScale.logicalToCoordinate(verticalObj.logical as never) ?? null
            : timeScale?.timeToCoordinate(verticalObj.timestamp as Time) ?? null;
          if (typeof xx === 'number' && Math.abs(x - xx) < 5) return obj.id;
          break;
        }
        case 'line':
        case 'arrow': {
          const lineObj = obj as DrawingObject & { type: 'line' | 'arrow' };
          const sx = lineObj.startLogical != null && timeScale
            ? timeScale.logicalToCoordinate(lineObj.startLogical as never) ?? null
            : timeScale?.timeToCoordinate(lineObj.startX as Time) ?? null;
          const sy = series?.priceToCoordinate(lineObj.startY) ?? null;
          const ex = lineObj.endLogical != null && timeScale
            ? timeScale.logicalToCoordinate(lineObj.endLogical as never) ?? null
            : timeScale?.timeToCoordinate(lineObj.endX as Time) ?? null;
          const ey = series?.priceToCoordinate(lineObj.endY) ?? null;
          if (typeof sx === 'number' && typeof sy === 'number' && typeof ex === 'number' && typeof ey === 'number') {
            const dist = distanceToLine(x, y, sx, sy, ex, ey);
            if (dist < 8) return obj.id;
          }
          break;
        }
        case 'area': {
          const areaObj = obj as DrawingObject & { type: 'area' };
          const sx = areaObj.startLogical != null && timeScale
            ? timeScale.logicalToCoordinate(areaObj.startLogical as never) ?? null
            : timeScale?.timeToCoordinate(areaObj.startX as Time) ?? null;
          const sy = series?.priceToCoordinate(areaObj.startY) ?? null;
          const ex = areaObj.endLogical != null && timeScale
            ? timeScale.logicalToCoordinate(areaObj.endLogical as never) ?? null
            : timeScale?.timeToCoordinate(areaObj.endX as Time) ?? null;
          const ey = series?.priceToCoordinate(areaObj.endY) ?? null;
          if (typeof sx === 'number' && typeof sy === 'number' && typeof ex === 'number' && typeof ey === 'number') {
            const minX = Math.min(sx, ex);
            const maxX = Math.max(sx, ex);
            const minY = Math.min(sy, ey);
            const maxY = Math.max(sy, ey);
            if (x >= minX && x <= maxX && y >= minY && y <= maxY) return obj.id;
          }
          break;
        }
        case 'text': {
          const textObj = obj as DrawingObject & { type: 'text' };
          const xx = textObj.logical != null && timeScale
            ? timeScale.logicalToCoordinate(textObj.logical as never) ?? null
            : timeScale?.timeToCoordinate(textObj.x as Time) ?? null;
          const yy = series?.priceToCoordinate(textObj.y) ?? null;
          if (typeof xx === 'number' && typeof yy === 'number') {
            const fontSize = textObj.fontSize ?? 12;
            const textWidth = Math.max(50, textObj.text.length * 8); // Приблизительная ширина
            const textHeight = fontSize * 1.2;
            
            // Проверяем попадание в область текста
            const padding = 6;
            if (x >= xx - padding && x <= xx + textWidth + padding &&
                y >= yy - textHeight/2 - padding && y <= yy + textHeight/2 + padding) {
              return obj.id;
            }
          }
          break;
        }
      }
    }
    return null;
  }, [drawingObjects, chart, series]);

  // Вспомогательная функция для расстояния до линии
  const distanceToLine = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    const param = dot / lenSq;
    
    let xx: number, yy: number;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Обработчики событий мыши и касания
  const getEventCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let clientX: number, clientY: number;
    
    if ('touches' in e && e.touches.length > 0) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return null;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleStart = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Предотвращаем всплытие событий
    e.stopPropagation();
    
    // Для touch событий не используем preventDefault (вызывает предупреждение)
    if (e.type !== 'touchstart' && e.type !== 'touchmove' && e.type !== 'touchend') {
      e.preventDefault();
    }
    
    // Для touch событий устанавливаем флаг немедленно
    if (e.type === 'touchstart') {
      console.log('DrawingCanvas handleStart: touchstart detected, setting drawing state immediately');
      isDrawingRef.current = true;
      setIsDrawing(true);
    }
    
    // Защита от двойного вызова (временно отключена для отладки)
    // if (isProcessingStartRef.current) {
    //   return;
    // }
    
    const coords = getEventCoordinates(e);
    if (!coords) return;
    
    const point = pixelToPoint(coords.x, coords.y);

    if (drawingMode === 'remove') {
      const objectId = getObjectAtPoint(coords.x, coords.y);
      setHoveredObjectId(objectId);
      if (objectId) {
        onRemoveDrawingObject(objectId);
      }
      if (onSelectObject) onSelectObject(objectId ?? null);
      return;
    }

    if (activeTool === 'none') {
      return;
    }

    if (activeTool === 'text') {
      // Request text placement - this will open the modal
      if (onTextPlacementRequest) {
        onTextPlacementRequest({
          x: point.x,
          y: point.y,
          price: point.price,
          time: point.time,
          logical: point.logical,
        });
      }
      return;
    }

    console.log('DrawingCanvas handleStart: starting drawing with', { activeTool, point, eventType: e.type });

    // Устанавливаем состояние рисования
    setStartPoint(point);
    setCurrentPoint(point);
    setIsDrawing(true);
    isDrawingRef.current = true;
  }, [activeTool, drawingMode, pixelToPoint, getObjectAtPoint, onAddDrawingObject, onRemoveDrawingObject, onSelectObject, onTextPlacementRequest]);

  const handleMove = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    console.log('DrawingCanvas handleMove:', { isDrawing, activeTool, eventType: e.type });
    
    const coords = getEventCoordinates(e);
    if (!coords) return;

    if (drawingMode === 'remove') {
      const objectId = getObjectAtPoint(coords.x, coords.y);
      setHoveredObjectId(objectId);
      if (objectId) {
        onRemoveDrawingObject(objectId);
      }
      if (onSelectObject) onSelectObject(objectId ?? null);
      return;
    }

    // Проверяем, что у нас есть активный инструмент и мы в режиме рисования
    if (activeTool === 'none') {
      console.log('DrawingCanvas handleMove: no active tool, returning');
      return;
    }
    
    // Если нет startPoint, значит handleStart еще не сработал
    if (!startPoint) {
      console.log('DrawingCanvas handleMove: no start point yet, returning');
      return;
    }
    
    // На touch устройствах проверяем touchmove
    if (e.type === 'touchmove' && !isDrawingRef.current) {
      console.log('DrawingCanvas handleMove: touchmove before drawing started, returning');
      return;
    }
    
    if (!isDrawingRef.current) {
      console.log('DrawingCanvas handleMove: not drawing, returning');
      return;
    }
    
    const point = pixelToPoint(coords.x, coords.y);
    setCurrentPoint(point);
    console.log('DrawingCanvas handleMove: updating current point');
    
    // Непосредственно перерисуем превью без ожидания эффекта
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (ctx && chart && series && startPoint) {
      ctx.clearRect(0, 0, containerWidth, containerHeight);
      drawingObjects.forEach(obj => {
        drawObject(ctx, obj, hoveredObjectId === obj.id);
      });
      drawPreview(ctx, activeTool, startPoint, point);
    }
  }, [drawingMode, pixelToPoint, getObjectAtPoint, onSelectObject, onRemoveDrawingObject, chart, series, containerWidth, containerHeight, drawingObjects, hoveredObjectId, activeTool, startPoint, drawObject, drawPreview, isDrawing]);

  const handleEnd = useCallback(() => {
    console.log('DrawingCanvas handleEnd:', { isDrawing, activeTool, hasStartPoint: !!startPoint, hasCurrentPoint: !!currentPoint });
    
    if (!isDrawingRef.current || !startPoint || !currentPoint || activeTool === 'none') {
      console.log('DrawingCanvas handleEnd: conditions not met, returning');
      setIsDrawing(false);
      isDrawingRef.current = false;
      setStartPoint(null);
      setCurrentPoint(null);
      // isProcessingStartRef.current = false;
      return;
    }

    let newObject: DrawingObject | null = null;

    switch (activeTool) {
      case 'horizontalLine':
        newObject = {
          id: `horizontal_${String(Date.now())}`,
          type: 'horizontalLine',
          price: startPoint.price,
          createdAt: Date.now()
        };
        break;
      case 'verticalLine':
        newObject = {
          id: `vertical_${String(Date.now())}`,
          type: 'verticalLine',
          timestamp: startPoint.time,
          logical: startPoint.logical,
          pixelX: startPoint.x, // fallback
          createdAt: Date.now()
        };
        break;
      case 'line':
        newObject = {
          id: `line_${String(Date.now())}`,
          type: 'line',
          startX: startPoint.time,
          startY: startPoint.price,
          endX: currentPoint.time,
          endY: currentPoint.price,
          startLogical: startPoint.logical,
          endLogical: currentPoint.logical,
          startPixelX: startPoint.x,
          startPixelY: startPoint.y,
          endPixelX: currentPoint.x,
          endPixelY: currentPoint.y,
          createdAt: Date.now()
        };
        break;
      case 'arrow':
        newObject = {
          id: `arrow_${String(Date.now())}`,
          type: 'arrow',
          startX: startPoint.time,
          startY: startPoint.price,
          endX: currentPoint.time,
          endY: currentPoint.price,
          startLogical: startPoint.logical,
          endLogical: currentPoint.logical,
          startPixelX: startPoint.x,
          startPixelY: startPoint.y,
          endPixelX: currentPoint.x,
          endPixelY: currentPoint.y,
          createdAt: Date.now()
        };
        break;
      case 'area':
        newObject = {
          id: `area_${String(Date.now())}`,
          type: 'area',
          startX: startPoint.time,
          startY: startPoint.price,
          endX: currentPoint.time,
          endY: currentPoint.price,
          startLogical: startPoint.logical,
          endLogical: currentPoint.logical,
          startPixelX: startPoint.x,
          startPixelY: startPoint.y,
          endPixelX: currentPoint.x,
          endPixelY: currentPoint.y,
          createdAt: Date.now()
        };
        break;
    }


    
    if (newObject) {
      onAddDrawingObject(newObject);
    }

    setIsDrawing(false);
    isDrawingRef.current = false;
    setStartPoint(null);
    setCurrentPoint(null);
    // isProcessingStartRef.current = false;
  }, [isDrawing, startPoint, currentPoint, activeTool, onAddDrawingObject]);

  // Эффекты
  useEffect(() => {
    setupCanvas();
  }, [setupCanvas]);

  // Без лагов: перерисовываем сразу при изменениях
  useEffect(() => { drawAllObjects(); }, [drawAllObjects]);

  // Курсор
  const getCursor = () => {
    if (activeTool === 'none') return 'default';
    if (drawingMode === 'remove') return hoveredObjectId ? 'pointer' : 'not-allowed';
    return 'crosshair';
  };

  // Показываем canvas если есть активный инструмент ИЛИ есть нарисованные объекты
  // ИЛИ мы в режиме удаления
  if (activeTool === 'none' && drawingObjects.length === 0 && drawingMode !== 'remove') return null;

  return (
    <canvas
      ref={canvasRef}
      width={containerWidth}
      height={containerHeight}
      className={`absolute top-0 left-0 ${(activeTool !== 'none' || drawingMode === 'remove') ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{ 
        cursor: getCursor(),
        zIndex: 20,
        touchAction: 'none', // Отключаем стандартные touch действия браузера
        userSelect: 'none', // Отключаем выделение текста
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
      // Mouse events
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={() => {
        setIsDrawing(false);
        isDrawingRef.current = false;
        setStartPoint(null);
        setCurrentPoint(null);
        setHoveredObjectId(null);
      }}
      // Touch events
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onTouchCancel={() => {
        setIsDrawing(false);
        isDrawingRef.current = false;
        setStartPoint(null);
        setCurrentPoint(null);
        setHoveredObjectId(null);
      }}

    />
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;