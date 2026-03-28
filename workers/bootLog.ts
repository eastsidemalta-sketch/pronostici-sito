/** Primo modulo caricato: stderr di solito non è bufferizzato, utile sotto PM2. */
const ts = new Date().toISOString();
process.stderr.write(
  `[workers] boot ${ts} cwd=${process.cwd()} argv=${JSON.stringify(process.argv.slice(2))}\n`
);
