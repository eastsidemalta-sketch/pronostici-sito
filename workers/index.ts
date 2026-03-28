import "./bootLog";
import { DirectBookmakerPoller } from './pollers/DirectBookmakerPoller';
import { NetwinDeltaPoller } from './pollers/NetwinDeltaPoller';

console.log('====================================');
console.log('Starting background workers...');
console.log('====================================');

/** Bookmaker con API diretta in `data/bookmakers.json`, escluso netwinit (NetwinDeltaPoller). */
const pollers = [
  new DirectBookmakerPoller('betboom', 60_000),
  new DirectBookmakerPoller('betwinner_br', 120_000),
  new NetwinDeltaPoller(15_000),
];

pollers.forEach((p) => p.start());

function shutdown(signal: string): void {
  console.log(`[workers] ${signal}: shutting down gracefully...`);
  pollers.forEach((p) => p.stop());
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
