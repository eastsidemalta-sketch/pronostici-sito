#!/bin/bash
# Aumenta il limite di file aperti (risolve EMFILE: too many open files)
# Su macOS recenti potrebbe essere necessario eseguire prima:
#   launchctl limit maxfiles 65536 200000
ulimit -n 65536 2>/dev/null || true
exec npm run dev
