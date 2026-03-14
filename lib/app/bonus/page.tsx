import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bonus Bookmaker",
  description: "Bonus e promozioni dei bookmaker. Codici bonus, offerte di benvenuto e free bet.",
};

export default function BonusPage() {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Bonus
        </h1>
        <p className="mt-2 text-neutral-600">
          Qui inseriremo i bonus dei bookmaker.
        </p>
      </main>
    );
  }
  