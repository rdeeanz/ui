#!/usr/bin/env bash
# Regenerate prisma/d1-seed.sql (data-only) from prisma/dev.db.
# Tables are emitted in FK-dependency order so the seed applies cleanly.
set -euo pipefail

DB="prisma/dev.db"
SEED="prisma/d1-seed.sql"
TABLES=(Regional Pelabuhan KategoriFasilitas Fasilitas ObjekFasilitas Periode User Inspeksi CatatanObjek AuditLog)

{
  echo "-- Data seed for Cloudflare D1, generated from ${DB} by scripts/gen-d1-seed.sh"
  echo "-- Apply AFTER migrations:"
  echo "--   wrangler d1 execute mafp5-db --file=prisma/d1-seed.sql --local   (local dev)"
  echo "--   wrangler d1 execute mafp5-db --file=prisma/d1-seed.sql --remote  (production)"
  echo "PRAGMA defer_foreign_keys=true;"
} > "$SEED"

for t in "${TABLES[@]}"; do
  sqlite3 "$DB" -cmd ".mode insert \"$t\"" "SELECT * FROM \"$t\";" >> "$SEED"
done

echo "Wrote $SEED ($(grep -c '^INSERT' "$SEED") insert statements)"
