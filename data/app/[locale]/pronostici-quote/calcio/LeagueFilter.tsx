"use client";

interface LeagueFilterProps {
  leagues: Array<{
    league: { id: number; name: string; logo?: string };
    matches: any[];
  }>;
  onLeagueSelect: (leagueId: number | null) => void;
  selectedLeagueId: number | null;
}

export default function LeagueFilter({
  leagues,
  onLeagueSelect,
  selectedLeagueId,
}: LeagueFilterProps) {
  const total = leagues.reduce((sum, l) => sum + l.matches.length, 0);

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onLeagueSelect(null)}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${
            selectedLeagueId === null
              ? "border-2 border-[var(--foreground)] bg-white text-[var(--foreground)]"
              : "border border-[var(--card-border)] bg-white text-[var(--foreground-muted)] hover:bg-gray-50 hover:text-[var(--foreground)]"
          }`}
        >
          Tutti ({total})
        </button>
        {leagues.map((group) => (
          <button
            key={group.league.id}
            onClick={() => onLeagueSelect(group.league.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
              selectedLeagueId === group.league.id
                ? "border-2 border-[var(--foreground)] bg-white text-[var(--foreground)]"
                : "border border-[var(--card-border)] bg-white text-[var(--foreground-muted)] hover:bg-gray-50 hover:text-[var(--foreground)]"
            }`}
          >
            {group.league.logo && (
              <img
                src={group.league.logo}
                alt={`Logo ${group.league.name}`}
                className="h-5 w-5 object-contain"
              />
            )}
            <span>{group.league.name}</span>
            <span className="text-xs opacity-75">({group.matches.length})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
