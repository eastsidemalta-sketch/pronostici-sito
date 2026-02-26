/**
 * Verifica logica determineMarket.
 *
 * Scenario IT-only (attuale):
 * - Cookie invalido → defaultMarket
 * - Nessun match Accept-Language → defaultMarket
 *
 * Scenario IT+BR (futuro, BR.active=true):
 * - Accept-Language pt → BR
 * - Accept-Language it → IT
 * - Nessun match → defaultMarket
 * - Cookie invalido → defaultMarket
 */

import {
  determineMarket,
  MARKET_CONFIG,
  SUPPORTED_MARKETS,
  getActiveMarketCodes,
} from "../lib/markets";

function mockContext(overrides: {
  cookieMarket?: string;
  acceptLanguage?: string;
}) {
  return {
    cookies: overrides.cookieMarket
      ? {
          get: (n: string) =>
            n === "market" && overrides.cookieMarket
              ? { value: overrides.cookieMarket }
              : undefined,
        }
      : undefined,
    headers: overrides.acceptLanguage
      ? new Headers({ "accept-language": overrides.acceptLanguage })
      : undefined,
  };
}

console.log("=== Verifica Market Detection ===\n");
console.log("defaultMarket:", MARKET_CONFIG.defaultMarket);
console.log("mercati attivi:", getActiveMarketCodes().join(", "));
console.log("");

// IT-only scenario
console.log("--- Scenario IT-only (attuale) ---");

let r = determineMarket(mockContext({}));
console.log("Nessun cookie, nessun Accept-Language →", r, r === "IT" ? "✓" : "✗");

r = determineMarket(mockContext({ cookieMarket: "IT" }));
console.log("Cookie market=IT (valido) →", r, r === "IT" ? "✓" : "✗");

r = determineMarket(mockContext({ cookieMarket: "BR" }));
console.log("Cookie market=BR (invalido, non active) →", r, r === "IT" ? "✓" : "✗");

r = determineMarket(mockContext({ cookieMarket: "XX" }));
console.log("Cookie market=XX (inesistente) →", r, r === "IT" ? "✓" : "✗");

r = determineMarket(mockContext({ acceptLanguage: "it" }));
console.log("Accept-Language it →", r, r === "IT" ? "✓" : "✗");

r = determineMarket(mockContext({ acceptLanguage: "pt-BR,pt;q=0.9" }));
console.log("Accept-Language pt-BR (BR non active) →", r, r === "IT" ? "✓" : "✗");

r = determineMarket(mockContext({ acceptLanguage: "fr,en;q=0.9" }));
console.log("Accept-Language fr (FR non active) →", r, r === "IT" ? "✓" : "✗");

console.log("\n--- Scenario IT+BR (simulato) ---");
// Simulazione: patch temporaneo per BR active
const origBR = SUPPORTED_MARKETS.BR;
(SUPPORTED_MARKETS.BR as { active: boolean }).active = true;

r = determineMarket(mockContext({ acceptLanguage: "pt-BR,pt;q=0.9" }));
console.log("Accept-Language pt →", r, r === "BR" ? "✓" : "✗");

r = determineMarket(mockContext({ acceptLanguage: "it" }));
console.log("Accept-Language it →", r, r === "IT" ? "✓" : "✗");

r = determineMarket(mockContext({ acceptLanguage: "fr,en;q=0.9" }));
console.log("Nessun match Accept-Language →", r, r === "IT" ? "✓" : "✗");

r = determineMarket(mockContext({ cookieMarket: "BR" }));
console.log("Cookie market=BR (valido) →", r, r === "BR" ? "✓" : "✗");

r = determineMarket(mockContext({ cookieMarket: "FR" }));
console.log("Cookie market=FR (invalido, non active) →", r, r === "IT" ? "✓" : "✗");

// Ripristino
(SUPPORTED_MARKETS.BR as { active: boolean }).active = origBR.active;

console.log("\n=== Verifica completata ===");
