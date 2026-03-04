/**
 * PM2 config per droplet (test + produzione).
 * Test: pm2 start ecosystem.config.cjs --only pronostici-test
 * Prod: pm2 start ecosystem.config.cjs --only pronostici
 */
module.exports = {
  apps: [
    {
      name: "pronostici-test",
      cwd: "/var/www/pronostici-sito-test",
      script: "npm",
      args: "run start:test",
    },
    {
      name: "pronostici",
      cwd: "/var/www/pronostici-sito",
      script: "npm",
      args: "start",
      env: { PORT: 3000 },
    },
  ],
};
