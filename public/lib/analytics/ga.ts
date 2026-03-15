export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export const trackEvent = (
  eventName: string,
  params?: Record<string, any>
) => {
  if (!GA_ID || typeof window === "undefined" || !window.gtag) return;

  window.gtag("event", eventName, {
    ...params,
  });
};
