"use client";

import { useEffect, useState } from "react";

type Quote = {
  bookmaker: string;
  outcomes: {
    home?: number;
    draw?: number;
    away?: number;
  };
};

export default function Quotes1X2({ sportKey }: { sportKey: string }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/quotes?sportKey=${sportKey}`)
      .then((res) => res.json())
      .then((data) => {
        setQuotes(data.quotes || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sportKey]);

  if (loading) {
    return <p className="mt-6 text-gray-500">Caricamento quote…</p>;
  }

  if (!quotes.length) {
    return <p className="mt-6 text-gray-500">Quote non disponibili</p>;
  }

  const best = {
    home: Math.max(...quotes.map((q) => q.outcomes.home || 0)),
    draw: Math.max(...quotes.map((q) => q.outcomes.draw || 0)),
    away: Math.max(...quotes.map((q) => q.outcomes.away || 0)),
  };

  return (
    <section className="mt-10 rounded-2xl border p-6">
      <h2 className="text-xl font-semibold mb-4">Quote 1X2</h2>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="rounded-xl border p-4">
          <div className="text-sm text-gray-500">1</div>
          <div className="text-2xl font-bold">{best.home.toFixed(2)}</div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="text-sm text-gray-500">X</div>
          <div className="text-2xl font-bold">{best.draw.toFixed(2)}</div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="text-sm text-gray-500">2</div>
          <div className="text-2xl font-bold">{best.away.toFixed(2)}</div>
        </div>
      </div>
    </section>
  );
}
