/**
 * PM2 config per droplet (test + produzione).
 * Test: pm2 start ecosystem.config.cjs --only pronostici-test
 * Prod: pm2 start ecosystem.config.cjs --only pronostici
 * Worker test: pm2 start ecosystem.config.cjs --only pronostici-test-data-workers
 * Worker prod: pm2 start ecosystem.config.cjs --only pronostici-data-workers
 *
 * REDIS_URL: se già esportata nel shell, ha priorità (consigliato su repo pubblici).
 */
const REDIS_URL =
  process.env.REDIS_URL ||
  "rediss://default:AcqMAAIncDI3MzUwNzZjYjI4MjI0ZjIyODI5Nzc4NWI5MjM4ODI1ZnAyNTE4NTI@keen-hamster-51852.upstash.io:6379";

module.exports = {
  apps: [
    {
      name: "pronostici-test",
      cwd: "/var/www/pronostici-sito-test/.next/standalone",
      script: "node",
      args: "server.js",
      env: {
        PORT: 3001,
        HOSTNAME: "0.0.0.0",
        LIVE_API_MONTHLY_BUDGET: "4500000",
        REDIS_URL,
      },
    },
    {
      name: "pronostici",
      cwd: "/var/www/pronostici-sito/.next/standalone",
      script: "./start-standalone.sh",
      interpreter: "bash",
      env: {
        PORT: "3000",
        HOSTNAME: "0.0.0.0",
        LIVE_API_MONTHLY_BUDGET: "4500000",
        REDIS_URL,
      },
    },
    {
      name: "pronostici-test-data-workers",
      cwd: "/var/www/pronostici-sito-test",
      script: "npx",
      args: "tsx workers/index.ts",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        REDIS_URL,
      },
    },
    {
      name: "pronostici-data-workers",
      cwd: "/var/www/pronostici-sito",
      script: "npx",
      args: "tsx workers/index.ts",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        REDIS_URL,
      },
    },
  ],
};
