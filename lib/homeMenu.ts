/** Sport disponibili per il menu principale */
export const SPORTS = [
  { key: "calcio", label: "Calcio", href: "/pronostici-quote/calcio" },
  { key: "tennis", label: "Tennis", href: "/pronostici-quote/tennis" },
  { key: "basket", label: "Basket", href: "/pronostici-quote/basket" },
  { key: "rugby", label: "Rugby", href: "/pronostici-quote/rugby" },
] as const;

/** Competizioni calcio (leagueId API-Football, nome, tipo) */
export const CALCIO_COMPETITIONS = [
  { id: 2, name: "Champions League", type: "cup" as const },
  { id: 3, name: "Europa League", type: "cup" as const },
  { id: 4, name: "Conference League", type: "cup" as const },
  { id: 39, name: "Premier League", type: "league" as const },
  { id: 135, name: "Serie A", type: "league" as const },
  { id: 136, name: "Serie B", type: "league" as const },
  { id: 140, name: "La Liga", type: "league" as const },
  { id: 78, name: "Bundesliga", type: "league" as const },
  { id: 61, name: "Ligue 1", type: "league" as const },
  { id: 203, name: "Super Lig", type: "league" as const },
  { id: 94, name: "Liga Portugal", type: "league" as const },
  { id: 138, name: "Serie C - Girone A", type: "league" as const },
  { id: 942, name: "Serie C - Girone B", type: "league" as const },
  { id: 943, name: "Serie C - Girone C", type: "league" as const },
  { id: 137, name: "Coppa Italia", type: "cup" as const },
  { id: 142, name: "FA Cup", type: "cup" as const },
  { id: 143, name: "Copa del Rey", type: "cup" as const },
  { id: 148, name: "DFB-Pokal", type: "cup" as const },
  { id: 66, name: "Coupe de France", type: "cup" as const },
];

export type MenuItem = {
  key: string;
  label: string;
  href: string;
  subItems: Array<{ id: number; name: string; type: "league" | "cup" }>;
};

/** Config per "Tutti gli sport" (quando sport=all): quali sport e competizioni mostrare */
export type AllSportsConfig = {
  sportKeys: string[];
  leagueIds: number[];
};

/** Configurazione menu per paese: menu principale (sport) e sotto-menu (competizioni) */
export type HomeMenuConfig = Record<
  string,
  {
    menuItems: MenuItem[];
    /** Opzionale: cosa mostrare quando "Tutti gli sport" è selezionato */
    allSportsConfig?: AllSportsConfig;
  }
>;
