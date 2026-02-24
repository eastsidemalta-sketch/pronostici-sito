/**
 * Rileva se la richiesta proviene da un bot/crawler.
 * Usato per: mostrare Coming Soon a utenti reali, notFound() a bot.
 *
 * ⚠️ Non perfetto: alcuni bot spoofano user-agent.
 * In dubbio: usare notFound().
 */

const BOT_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i, // Yahoo
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /rogerbot/i,
  /linkedinbot/i,
  /embedly/i,
  /quora link preview/i,
  /showyoubot/i,
  /outbrain/i,
  /pinterest/i,
  /slackbot/i,
  /vkshare/i,
  /w3c_validator/i,
  /redditbot/i,
  /applebot/i,
  /whatsapp/i,
  /flipboard/i,
  /tumblr/i,
  /bitlybot/i,
  /skypeuripreview/i,
  /nuzzel/i,
  /discordbot/i,
  /qwantify/i,
  /pocket/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /screaming frog/i,
  /petalbot/i,
  /bytespider/i, // ByteDance
  /gptbot/i,
  /claudebot/i,
  /anthropic-ai/i,
  /cohere-ai/i,
];

export function isBotUserAgent(userAgent: string | null): boolean {
  if (!userAgent || typeof userAgent !== "string") return false;
  return BOT_PATTERNS.some((p) => p.test(userAgent));
}

/**
 * Da usare in Server Component / Route Handler.
 * Passa headers() da next/headers.
 */
export function isBotRequest(headers: Headers): boolean {
  const ua = headers.get("user-agent");
  return isBotUserAgent(ua);
}
