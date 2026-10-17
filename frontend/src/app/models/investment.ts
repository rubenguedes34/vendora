/** A coin row from the CoinGecko markets endpoint. */
export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  sparkline_in_7d?: { price: number[] };
}

/** Translated asset-type label ("Real Estate" -> `<ns>.types.realEstate`); unknown types pass through. */
export function assetTypeLabel(
  translate: { instant(key: string): string },
  ns: string,
  type: string,
): string {
  const slug = type
    .split(/\s+/)
    .map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w.toLowerCase()))
    .join('');
  const key = `${ns}.types.${slug}`;
  const label = translate.instant(key);
  return label === key ? type : label;
}
