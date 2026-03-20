import { describe, it, expect } from 'vitest';
import { formatNumber, formatCurrency } from './format';

describe('formatNumber', () => {
  it('should format integers with pt-BR thousands separator', () => {
    expect(formatNumber(10000)).toBe('10.000');
  });

  it('should format zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('should format negative numbers', () => {
    expect(formatNumber(-5000)).toBe('-5.000');
  });

  it('should format decimals', () => {
    expect(formatNumber(1234.56)).toBe('1.234,56');
  });

  it('should format large numbers', () => {
    expect(formatNumber(1000000)).toBe('1.000.000');
  });
});

describe('formatCurrency', () => {
  it('should format as BRL currency', () => {
    const result = formatCurrency(1200);
    expect(result).toContain('R$');
    expect(result).toContain('1.200,00');
  });

  it('should format zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('R$');
    expect(result).toContain('0,00');
  });

  it('should format negative values', () => {
    const result = formatCurrency(-500);
    expect(result).toContain('R$');
    expect(result).toContain('500,00');
  });

  it('should format decimal values', () => {
    const result = formatCurrency(19.9);
    expect(result).toContain('R$');
    expect(result).toContain('19,90');
  });
});
