/**
 * Store search links for a part, so a buyer can check today's price
 * themselves. Rankings never use these (they carry no affiliate tags).
 */

export interface StoreSearchLink {
  readonly store: string;
  readonly url: string;
}

function dashed(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getStoreSearchLinks(
  partName: string,
  currency: 'USD' | 'BRL',
): StoreSearchLink[] {
  const q = encodeURIComponent(partName.trim());
  if (currency === 'BRL') {
    return [
      {
        store: 'KaBuM!',
        url: `https://www.kabum.com.br/busca/${dashed(partName)}`,
      },
      { store: 'Pichau', url: `https://www.pichau.com.br/search?q=${q}` },
      {
        store: 'Terabyte',
        url: `https://www.terabyteshop.com.br/busca?str=${q}`,
      },
      {
        store: 'Mercado Livre',
        url: `https://lista.mercadolivre.com.br/${dashed(partName)}`,
      },
      {
        store: 'Google Shopping',
        url: `https://www.google.com/search?tbm=shop&q=${q}`,
      },
    ];
  }
  return [
    { store: 'Newegg', url: `https://www.newegg.com/p/pl?d=${q}` },
    { store: 'Amazon', url: `https://www.amazon.com/s?k=${q}` },
    { store: 'PCPartPicker', url: `https://pcpartpicker.com/search/?q=${q}` },
    {
      store: 'Google Shopping',
      url: `https://www.google.com/search?tbm=shop&q=${q}`,
    },
  ];
}
