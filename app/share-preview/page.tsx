export const metadata = {
  title: "Anteprima share social - PlaySignal",
  robots: "noindex, nofollow",
};

export default function SharePreviewPage() {
  return (
    <div className="min-h-screen bg-gray-200 p-8">
      <h1 className="mb-6 text-xl font-medium text-gray-700">
        Anteprima share social
      </h1>
      <div className="flex max-w-[600px] flex-col gap-8">
        <div className="overflow-hidden rounded-xl bg-white shadow-md">
          <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
            Facebook / LinkedIn / WhatsApp
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
                playsignal.io
              </div>
              <div className="font-semibold text-gray-900">
                PlaySignal | Calcio, Quote e Analisi Partite
              </div>
              <div className="text-sm text-gray-600">
                Analisi basate su dati, probabilità e segnali intelligenti per
                interpretare le quote dei bookmaker. Confronta eventi sportivi e
                prendi decisioni più informate.
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl bg-white shadow-md">
          <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
            Twitter / X (summary_large_image)
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
                playsignal.io
              </div>
              <div className="font-semibold text-gray-900">
                PlaySignal | Calcio, Quote e Analisi Partite
              </div>
              <div className="text-sm text-gray-600">
                Analisi basate su dati, probabilità e segnali intelligenti per
                interpretare le quote dei bookmaker.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
