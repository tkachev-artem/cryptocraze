// Типы для системы рисования на графике
export type DrawingTool = 
  | 'none'
  | 'horizontalLine'
  | 'verticalLine' 
  | 'line'
  | 'text'
  | 'area'
  | 'arrow';

export type DrawingMode = 'add' | 'remove';

// Базовый тип для всех объектов рисования
export type BaseDrawingObject = {
  id: string;
  type: DrawingTool;
  createdAt: number;
}

// Горизонтальная линия
export type HorizontalLineObject = {
  type: 'horizontalLine';
  price: number; // Y координата (цена)
} & BaseDrawingObject

// Вертикальная линия
export type VerticalLineObject = {
  type: 'verticalLine';
  timestamp: number; // X координата (время)
  logical?: number; // логический индекс бара
  pixelX?: number; // fallback pixel position
} & BaseDrawingObject

// Диагональная линия
export type LineObject = {
  type: 'line';
  startX: number; // timestamp
  startY: number; // price
  endX: number;   // timestamp
  endY: number;   // price
  startLogical?: number; // логический индекс бара
  endLogical?: number;   // логический индекс бара
  startPixelX?: number; // fallback pixel positions
  startPixelY?: number;
  endPixelX?: number;
  endPixelY?: number;
} & BaseDrawingObject

// Текст
export type TextObject = {
  type: 'text';
  x: number; // timestamp
  y: number; // price
  text: string;
  fontSize?: number;
  color?: string;
  logical?: number; // логический индекс бара
  pixelX?: number; // fallback pixel positions
  pixelY?: number;
} & BaseDrawingObject

// Выделение области
export type AreaObject = {
  type: 'area';
  startX: number; // timestamp
  startY: number; // price
  endX: number;   // timestamp  
  endY: number;   // price
  startLogical?: number; // логический индекс бара
  endLogical?: number;   // логический индекс бара
  startPixelX?: number; // fallback pixel positions
  startPixelY?: number;
  endPixelX?: number;
  endPixelY?: number;
} & BaseDrawingObject

// Стрелка
export type ArrowObject = {
  type: 'arrow';
  startX: number; // timestamp
  startY: number; // price
  endX: number;   // timestamp
  endY: number;   // price
  startLogical?: number; // логический индекс бара
  endLogical?: number;   // логический индекс бара
  startPixelX?: number; // fallback pixel positions
  startPixelY?: number;
  endPixelX?: number;
  endPixelY?: number;
} & BaseDrawingObject

// Объединенный тип для всех объектов рисования
export type DrawingObject = 
  | HorizontalLineObject
  | VerticalLineObject
  | LineObject
  | TextObject
  | AreaObject
  | ArrowObject;

// Состояние системы рисования
export type DrawingState = {
  mode: DrawingMode;
  activeTool: DrawingTool;
  objects: DrawingObject[];
  isDrawing: boolean;
  currentObject?: Partial<DrawingObject>;
}

// Координаты мыши/касания на графике
export type ChartCoordinates = {
  x: number; // пиксели
  y: number; // пиксели
  timestamp: number; // время
  price: number; // цена
}