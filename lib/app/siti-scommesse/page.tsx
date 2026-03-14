import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Siti Scommesse",
  description: "Schede bookmaker, recensioni e link ai migliori siti scommesse. Confronta quote e bonus.",
};

export default function SitiScommessePage() {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Siti Scommesse
        </h1>
        <p className="mt-2 text-neutral-600">
          Qui inseriremo le schede dei bookmaker.
        </p>
      </main>
    );
  }
  