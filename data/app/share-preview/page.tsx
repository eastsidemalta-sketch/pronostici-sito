import { getOgMetadata } from "@/lib/seo/ogMetadata";

export const metadata = {
  title: "Anteprima share social - PlaySignal",
  robots: "noindex, nofollow",
};

const LOCALES_TO_PREVIEW = [
  { locale: "it", label: "Italia (/it)" },
  { locale: "pt-BR", label: "Brasil (/pt-BR)" },
  { locale: "es-CO", label: "Colombia (/es-CO)" },
] as const;

export default function SharePreviewPage() {
  return (
    <div className="min-h-screen bg-gray-200 p-8">
      <h1 className="mb-6 text-xl font-medium text-gray-700">
        Anteprima share social (per paese)
      </h1>
      <div className="flex max-w-[600px] flex-col gap-8">
        {LOCALES_TO_PREVIEW.map(({ locale, label }) => {
          const og = getOgMetadata(locale);
          return (
            <div key={locale} className="overflow-hidden rounded-xl bg-white shadow-md">
              <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                {label}
              </h2>
              <div>
                <img
                  src="/og-image.png"
                  alt="PlaySignal - See the signal. Play it."
                  className="block w-full object-cover"
                  style={{ aspectRatio: "1200/630" }}
                />
                <div className="space-y-1 p-4">
                  <div className="text-xs uppercase tracking-wider text-gray-500">
                    playsignal.io/{locale}
                  </div>
                  <div className="font-semibold text-gray-900">{og.title}</div>
                  <div className="text-sm text-gray-600">{og.description}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
