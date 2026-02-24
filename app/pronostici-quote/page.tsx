import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pronostici e Quote",
  description: "Seleziona uno sport per vedere partite, quote e pronostici. Calcio, basket, tennis, rugby.",
};

const sports = [
    { name: "Calcio", href: "/pronostici-quote/calcio" },
    { name: "Basket", href: "/pronostici-quote/basket" },
    { name: "Tennis", href: "/pronostici-quote/tennis" },
    { name: "Rugby", href: "/pronostici-quote/rugby" },
  ];
  
  export default function PronosticiQuotePage() {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Pronostici e Quote
        </h1>
  
        <p className="mt-2 text-neutral-600">
          Seleziona uno sport per vedere partite, quote e pronostici.
        </p>
  
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {sports.map((sport) => (
            <a
              key={sport.name}
              href={sport.href}
              className="rounded-2xl border p-5 hover:bg-neutral-50"
            >
              <div className="text-lg font-medium">
                {sport.name}
              </div>
            </a>
          ))}
        </div>
      </main>
    );
  }
  

  