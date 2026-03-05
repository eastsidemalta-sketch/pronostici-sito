#!/bin/sh
# Wrapper per avviare server.js standalone con env espliciti.
# Usato da PM2 per prod (porta 3000).
export PORT=${PORT:-3000}
export HOSTNAME=${HOSTNAME:-0.0.0.0}
exec node server.js
