/**
 * PM2 config per droplet (test + produzione).
 * Test: pm2 start ecosystem.config.cjs --only pronostici-test
 * Prod: pm2 start ecosystem.config.cjs --only pronostici
 */
module.exports = {
  apps: [
    {
      name: "pronostici-test",
      cwd: "/var/www/pronostici-sito-test/.next/standalone",
      script: "node",
      args: "server.js",
      env: { PORT: 3001, HOSTNAME: "0.0.0.0", CRON_SECRET: "VURWDkW6Jw" },
    },
    {
      name: "pronostici",
      cwd: "/var/www/pronostici-sito/.next/standalone",
      script: "./start-standalone.sh",
      interpreter: "bash",
      env: { PORT: "3000", HOSTNAME: "0.0.0.0", CRON_SECRET: "VURWDkW6Jw" },
    },
  ],
};
