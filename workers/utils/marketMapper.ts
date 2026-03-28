/**
 * Converte strutture native dei bookmaker (come in lib/quotes/providers/directBookmakerFetcher.ts)
 * in un oggetto quote piatto per worker / frontend.
 *
 * Riferimenti: data/bookmakers.json, docs/QUOTE-MARKETS-BETBOOM-NETWIN.md, docs/BETBOOM_MARKETS.md
 */

export type StandardMarkets = {
  match_winner_1?: number;
  match_winner_x?: number;
  match_winner_2?: number;
  under_2_5?: number;
  over_2_5?: number;
  under_1_5?: number;
  over_1_5?: number;
  goal?: number;
  nogoal?: number;
  double_chance_1x?: number;
  double_chance_12?: number;
  double_chance_x2?: number;
  spread_home?: number;
  spread_away?: number;
  spread_home_point?: number;
  spread_away_point?: number;
};

/** Stake Sporthub (Betboom) e sintetici post–scommesseToStakes (Netwin). */
export type BookmakerStake = {
  market_id?: number;
  market_name?: string;
  outcome_id?: number;
  name?: string;
  factor?: number;
  period_id?: unknown;
};

function num(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : NaN;
}

function matchTeamName(o: Record<string, unknown>, side: "home" | "away"): string {
  const teams = o.teams as Record<string, unknown> | undefined;
  const key = side === "home" ? "home_team" : "away_team";
  if (teams && typeof teams === "object") {
    const t = teams[key] as Record<string, unknown> | undefined;
    if (t && typeof t.name === "string") return t.name.trim();
  }
  if (side === "home") return String(o.home_team ?? o.homeTeam ?? "").trim();
  return String(o.away_team ?? o.awayTeam ?? "").trim();
}

/**
 * Betboom `matches[]` / nodo partita: stakes con market_id 1|2|3|14|20, market_name "Winner"|"Result"|…
 * @see extract1X2FromStakes / extractTotalsFromStakes in directBookmakerFetcher.ts
 */
export function mapBetboomMarkets(raw: unknown): StandardMarkets {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const stakesVal = o.stakes;
  const stakes = Array.isArray(stakesVal) ? (stakesVal as BookmakerStake[]) : [];
  const homeTeam = matchTeamName(o, "home") || "home";
  const awayTeam = matchTeamName(o, "away") || "away";

  return mergeStandardFromStakes(stakes, homeTeam, awayTeam, {
    marketName1x2: "Winner",
    outcomeId1: 1,
    outcomeIdX: 2,
    outcomeId2: 3,
  });
}

/**
 * Netwin / Exalogic dopo flatten: campi odds1, oddsX, odds2 + stakes da scommesseToStakes
 * (Lista 3 → 1X2 come market_id 1 Winner; 7989 → Total; 18 → BTTS; 15–17 → DC; 8 → Handicap).
 */
export function mapNetwinMarkets(raw: unknown): StandardMarkets {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const stakes = Array.isArray(o.stakes) ? (o.stakes as BookmakerStake[]) : [];
  const homeTeam = String(o.homeTeam ?? o.squadraCasa ?? o.squadra1 ?? "").trim() || "home";
  const awayTeam = String(o.awayTeam ?? o.squadraOspite ?? o.squadra2 ?? "").trim() || "away";

  const fromStakes = mergeStandardFromStakes(stakes, homeTeam, awayTeam, {
    marketName1x2: "Winner",
    outcomeId1: 1,
    outcomeIdX: 2,
    outcomeId2: 3,
  });

  const o1 = num(o.odds1);
  const ox = num(o.oddsX);
  const o2 = num(o.odds2);

  return {
    ...fromStakes,
    ...(o1 > 0 ? { match_winner_1: o1 } : {}),
    ...(ox > 0 ? { match_winner_x: ox } : {}),
    ...(o2 > 0 ? { match_winner_2: o2 } : {}),
  };
}

/**
 * Riga payload Betwinner (bwapipub pt.json): H/D/A, HD/HA/AD, TP/TO/TU, HP/HF/AF
 * @see directBookmakerFetcher.ts (isBetwinner branch)
 */
export function mapBetwinnerMarkets(raw: unknown): StandardMarkets {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const s: StandardMarkets = {};

  const h = num(o.H);
  const d = num(o.D);
  const a = num(o.A);
  if (h > 0) s.match_winner_1 = h;
  if (d > 0) s.match_winner_x = d;
  if (a > 0) s.match_winner_2 = a;

  const dc1x = num(o.HD);
  const dc12 = num(o.HA);
  const dcx2 = num(o.AD);
  if (dc1x > 0) s.double_chance_1x = dc1x;
  if (dc12 > 0) s.double_chance_12 = dc12;
  if (dcx2 > 0) s.double_chance_x2 = dcx2;

  const lineOU = num(o.TP);
  const over = num(o.TO);
  const under = num(o.TU);
  if (lineOU === 2.5) {
    if (over > 0) s.over_2_5 = over;
    if (under > 0) s.under_2_5 = under;
  } else if (lineOU === 1.5) {
    if (over > 0) s.over_1_5 = over;
    if (under > 0) s.under_1_5 = under;
  } else if (lineOU > 0 && over > 0 && under > 0) {
    if (Math.abs(lineOU - 2.5) < 0.01) {
      s.over_2_5 = over;
      s.under_2_5 = under;
    } else if (Math.abs(lineOU - 1.5) < 0.01) {
      s.over_1_5 = over;
      s.under_1_5 = under;
    }
  }

  const lineHdp = num(o.HP);
  const hf = num(o.HF);
  const af = num(o.AF);
  const ap = num(o.AP);
  if (!Number.isNaN(lineHdp) && hf > 0 && af > 0) {
    s.spread_home = hf;
    s.spread_away = af;
    s.spread_home_point = lineHdp;
    if (!Number.isNaN(ap)) s.spread_away_point = ap;
    else s.spread_away_point = -lineHdp;
  }

  return s;
}

export type BookmakerMapperKey = "betboom" | "netwinit" | "netwin" | "betwinner_br" | "betwinner";

export function mapBookmakerMarkets(
  bookmakerKey: string,
  raw: unknown
): StandardMarkets {
  const k = bookmakerKey.toLowerCase().replace(/-/g, "");
  if (k === "betboom") return mapBetboomMarkets(raw);
  if (k === "netwinit" || k === "netwin") return mapNetwinMarkets(raw);
  if (k === "betwinner_br" || k === "betwinner") return mapBetwinnerMarkets(raw);
  return {};
}

type Stakes1x2Config = {
  marketName1x2: string;
  outcomeId1: number;
  outcomeIdX: number;
  outcomeId2: number;
};

function mergeStandardFromStakes(
  stakes: BookmakerStake[],
  homeTeam: string,
  awayTeam: string,
  cfg: Stakes1x2Config
): StandardMarkets {
  const s: StandardMarkets = {};
  const homeNorm = homeTeam.toLowerCase().trim();
  const awayNorm = awayTeam.toLowerCase().trim();
  const accepted1x2 = new Set(
    ["winner", "result", cfg.marketName1x2.toLowerCase()].filter(Boolean)
  );
  const drawNames = new Set(["draw", "empate", "x", "tie", "pareggio"]);

  for (const st of stakes) {
    if (st.period_id != null && st.period_id !== "" && String(st.period_id).trim() !== "0")
      continue;

    const mkt = String(st.market_name ?? "").toLowerCase();
    const factor = num(st.factor);
    if (factor <= 0) continue;

    const mid = typeof st.market_id === "number" ? st.market_id : parseInt(String(st.market_id ?? 0), 10);
    const name = String(st.name ?? "").toLowerCase().trim();
    const outcomeId =
      typeof st.outcome_id === "number" ? st.outcome_id : parseInt(String(st.outcome_id ?? 0), 10);

    if (accepted1x2.has(mkt)) {
      if (outcomeId === cfg.outcomeId1) s.match_winner_1 = factor;
      else if (outcomeId === cfg.outcomeIdX) s.match_winner_x = factor;
      else if (outcomeId === cfg.outcomeId2) s.match_winner_2 = factor;
      else if (drawNames.has(name)) s.match_winner_x = factor;
      else if (name === "1") s.match_winner_1 = factor;
      else if (name === "2") s.match_winner_2 = factor;
      else if (homeNorm && name.includes(homeNorm)) s.match_winner_1 = factor;
      else if (awayNorm && name.includes(awayNorm)) s.match_winner_2 = factor;
    }

    if (mid === 2 || mkt === "handicap") {
      const handicapRe = /([+-]?\d+\.?\d*)/;
      const match = name.match(handicapRe);
      const point = match ? parseFloat(match[1]) : 0;
      const lineKey = Math.round(point * 10) / 10;
      if (
        name.includes(homeNorm) ||
        name.includes("home") ||
        (name.includes("1") && !name.includes("2"))
      ) {
        s.spread_home = factor;
        s.spread_home_point = lineKey;
      } else if (
        name.includes(awayNorm) ||
        name.includes("away") ||
        name.includes("2")
      ) {
        s.spread_away = factor;
        s.spread_away_point = lineKey;
      }
    }

    if (mid === 3 || mid === 79120 || mkt.includes("total")) {
      const overRe = /over|acima|mais|sopra|übert/i;
      const underRe = /under|abaixo|menos|sotto|unter/i;
      const point25Re = /2\.?5|2,5/;
      const point15Re = /1\.?5|1,5/;
      const n = String(st.name ?? "");
      const isOver = overRe.test(n);
      const isUnder = underRe.test(n);
      const is25 = point25Re.test(n) || point25Re.test(String(st.market_name ?? ""));
      const is15 = point15Re.test(n) || point15Re.test(String(st.market_name ?? ""));
      if (isOver && is25) s.over_2_5 = factor;
      else if (isUnder && is25) s.under_2_5 = factor;
      else if (isOver && is15) s.over_1_5 = factor;
      else if (isUnder && is15) s.under_1_5 = factor;
      else if (isOver && s.over_2_5 == null && s.over_1_5 == null) s.over_2_5 = factor;
      else if (isUnder && s.under_2_5 == null && s.under_1_5 == null) s.under_2_5 = factor;
    }

    if (mid === 14 || mkt.includes("both") || mkt.includes("btts") || mkt.includes("score")) {
      if (name === "yes" || name === "sì" || name === "si" || name === "sim") s.goal = factor;
      else if (name === "no" || name === "não" || name === "nao") s.nogoal = factor;
    }

    if (mid === 20 || mkt.includes("double") || mkt.includes("chance")) {
      const rawName = String(st.name ?? "");
      const dc1X = /1x|1 x|home.*draw|draw.*home/i;
      const dc12 = /12|1 2|home.*away|away.*home/i;
      const dcX2 = /x2|x 2|draw.*away|away.*draw/i;
      if (dc1X.test(rawName)) s.double_chance_1x = factor;
      else if (dc12.test(rawName)) s.double_chance_12 = factor;
      else if (dcX2.test(rawName)) s.double_chance_x2 = factor;
    }
  }

  return s;
}
