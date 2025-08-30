export type FormatMoneyOptions = {
  currencySymbol?: string;
  decimals?: number;
};

export const parseNumeric = (value: string | number): number => {
  if (typeof value === 'number') return value;
  const cleaned = value.replace(/[^0-9+\-.,]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
};

export const formatMoneyShort = (
  value: string | number,
  options?: FormatMoneyOptions,
): string => {
  const symbol = options?.currencySymbol ?? '$';
  const decimals = options?.decimals ?? 2;
  const num = parseNumeric(value);
  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);

  const format = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\.00$/, '')}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(2).replace(/\.00$/, '')}K`;
    return n.toFixed(n % 1 === 0 ? 0 : decimals);
  };

  return `${sign}${symbol}${format(abs)}`;
};

export const formatNumberShort = (value: string | number): string => {
  const num = parseNumeric(value);
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2).replace(/\.00$/, '')}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(2).replace(/\.00$/, '')}K`;
  return num.toString();
};

