'use client';

interface LeagueFilterProps {
  leagues: Array<{ league: { id: number; name: string; logo?: string }; matches: any[] }>;
  onLeagueSelect: (leagueId: number | null) => void;
  selectedLeagueId: number | null;
}

export default function LeagueFilter({ leagues, onLeagueSelect, selectedLeagueId }: LeagueFilterProps) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onLeagueSelect(null)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedLeagueId === null
              ? 'border-2 border-[var(--foreground)] bg-white text-[var(--foreground)]'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tutti ({leagues.reduce((sum, l) => sum + l.matches.length, 0)})
        </button>
        {leagues.map((group) => (
          <button
            key={group.league.id}
            onClick={() => onLeagueSelect(group.league.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedLeagueId === group.league.id
                ? 'border-2 border-[var(--foreground)] bg-white text-[var(--foreground)]'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {group.league.logo && (
              <img 
                src={group.league.logo} 
                alt={`Logo ${group.league.name}`}
                className="w-5 h-5 object-contain"
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
