import { isFreshQuote, providerStatus } from "./providers.mjs";

// Providers expose { name, supports(symbol), fetch(symbol) }. Additional providers
// can be registered without changing the API, symbol model, or watchlist logic.
export function createQuoteService(providers, { cacheTtlMs = 15_000, now = () => new Date() } = {}) {
  const cache = new Map();
  return {
    async load(symbols) {
      const quotes = [];
      const errors = [];
      await Promise.all(symbols.map(async symbol => {
        const current = now();
        const cached = cache.get(symbol);
        if (cached && current.getTime() - cached.cachedAt < cacheTtlMs && isFreshQuote(cached.quote, current)) {
          quotes.push({ ...cached.quote, cache: "hit" });
          return;
        }
        for (const provider of providers.filter(item => item.supports(symbol))) {
          try {
            const quote = await provider.fetch(symbol);
            if (quote.symbol !== symbol || !isFreshQuote(quote, now())) {
              throw new Error("Kurs fehlt, ist veraltet oder liegt in der Zukunft");
            }
            cache.set(symbol, { quote, cachedAt: now().getTime() });
            quotes.push({ ...quote, cache: "miss", fallback: provider !== providers[0] });
            return;
          } catch (error) {
            errors.push({ symbol, provider: provider.name, message: error.message || "Abruf fehlgeschlagen" });
          }
        }
      }));
      const bySymbol = new Map(quotes.map(quote => [quote.symbol, quote]));
      const ordered = symbols.flatMap(symbol => bySymbol.has(symbol) ? [bySymbol.get(symbol)] : []);
      return { quotes: ordered, errors, status: providerStatus(ordered, symbols) };
    }
  };
}
