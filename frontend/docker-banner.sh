#!/bin/sh
# Runs from nginx's /docker-entrypoint.d/ right before nginx starts. The
# frontend container only starts once the backend is healthy, so by now the
# whole stack is ready.
cat <<'BANNER'

==================================================
  Vendora is up and running

  App         http://localhost:4200
  API         http://localhost:8000
  Admin       http://localhost:8000/admin
  API docs    http://localhost:8000/api/documentation
==================================================

BANNER
