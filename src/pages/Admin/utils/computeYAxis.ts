export type YAxisType = 'percent' | 'auto';

export type ComputeYAxisOptions = {
  padMultiplier?: number; // коэффициент отступа, по умолчанию 1.2
};

export function computeYAxis(valuesInput: Array<number | null | undefined>, type: YAxisType = 'auto', opts: ComputeYAxisOptions = {}) {
  const pad = opts.padMultiplier && opts.padMultiplier > 1 ? opts.padMultiplier : 1.2;
  const values = (valuesInput || []).map(v => Number(v ?? 0));
  const maxVal = values.length ? Math.max(...values) : 0;
  const minVal = values.length ? Math.min(...values) : 0;

  if (type === 'percent') {
    return { min: 0, max: 100 };
  }

  if (maxVal <= 0 && minVal < 0) {
    // все значения отрицательные
    return { min: Math.floor(minVal * pad), max: 0 };
  }

  if (minVal >= 0 && maxVal > 0) {
    // все значения положительные
    const maxPadded = Math.ceil(maxVal * pad);
    return { min: 0, max: maxPadded > 0 ? maxPadded : 1 };
  }

  // смешанные значения
  const maxAbs = Math.max(Math.abs(maxVal), Math.abs(minVal));
  const bound = Math.ceil(maxAbs * pad) || 1;
  return { min: -bound, max: bound };
}


