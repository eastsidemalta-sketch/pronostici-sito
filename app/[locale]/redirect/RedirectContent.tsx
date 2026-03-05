"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  targetUrl: string;
  bookmakerName: string;
  bookmakerLogoUrl?: string | null;
};

export function RedirectContent({ targetUrl, bookmakerName, bookmakerLogoUrl }: Props) {
  const t = useTranslations("redirect");
  const [activeBall, setActiveBall] = useState(-1);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBall((prev) => {
        if (prev >= 4) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    const redirectTimer = setTimeout(() => {
      window.location.href = targetUrl;
    }, 6000);

    return () => {
      clearInterval(interval);
      clearTimeout(redirectTimer);
    };
  }, [targetUrl]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white px-6">
      <img
        src="/redirect-logo.png"
        alt="PlaySignal"
        className="mb-10 h-24 w-auto object-contain sm:h-32"
      />

      <p className="mb-6 max-w-md text-center text-lg text-gray-700">
        {t("transferring")}
      </p>

      {bookmakerLogoUrl && (
        <img
          src={bookmakerLogoUrl}
          alt={bookmakerName}
          className="mb-10 h-14 w-auto object-contain sm:h-16"
        />
      )}

      <div className="flex gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-3 w-3 rounded-full transition-colors duration-300 ${
              i <= activeBall ? "bg-[var(--accent)]" : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
