import { NextResponse } from "next/server";

/**
 * Endpoint diagnostico per Fly.io: misura tempo di risposta del server.
 * Chiama GET /api/debug/fly-perf e confronta con Render.
 *
 * - Se Fly.io è molto più lento: probabile problema config/rete.
 * - Se simile: il problema è altrove (API esterne, cold start, ecc.).
 */
export async function GET() {
  const start = Date.now();
  const mem = process.memoryUsage();
  const uptime = process.uptime();

  return NextResponse.json({
    ok: true,
    server: "fly",
    timestamp: new Date().toISOString(),
    responseTimeMs: Date.now() - start,
    uptimeSeconds: Math.round(uptime),
    memory: {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
    },
    env: {
      nodeEnv: process.env.NODE_ENV,
      hasApiFootball: !!process.env.API_FOOTBALL_KEY,
    },
  });
}
