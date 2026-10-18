/**
 * Format currency amount based on detected or selected currency ('USD' or 'BRL').
 */
export function formatCurrency(
  val: number,
  currency: 'USD' | 'BRL' = 'USD',
  showCents = false
): string {
  if (isNaN(val)) return currency === 'BRL' ? 'R$ 0' : '$0';

  if (currency === 'BRL') {
    return `R$ ${val.toLocaleString('pt-BR', {
      minimumFractionDigits: showCents || val % 1 !== 0 ? 2 : 0,
      maximumFractionDigits: 2,
    })}`;
  }

  return `$${val.toLocaleString('en-US', {
    minimumFractionDigits: showCents && val % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Returns currency symbol string ('R$' or '$').
 */
export function getCurrencySymbol(currency: 'USD' | 'BRL' = 'USD'): string {
  return currency === 'BRL' ? 'R$' : '$';
}
