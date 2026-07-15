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

# Prisma's native SQLite driver stores DateTime as integer milliseconds, but the
# D1 adapter (@prisma/adapter-d1) only recognizes a column as DateTime when the
# stored value is an ISO-8601 string. A verbatim dump therefore yields integers
# that D1 cannot convert back ("Could not convert value … to type DateTime").
# For each table we build an explicit column list that rewrites every DATETIME
# column to an ISO-8601 string via strftime, leaving all other columns untouched.
for t in "${TABLES[@]}"; do
  cols=$(sqlite3 "$DB" "SELECT group_concat(
      CASE WHEN UPPER(type) = 'DATETIME'
        THEN 'strftime(''%Y-%m-%dT%H:%M:%f'', \"' || name || '\"/1000.0, ''unixepoch'') || ''+00:00'''
        ELSE '\"' || name || '\"'
      END, ', ') FROM pragma_table_info('$t');")
  sqlite3 "$DB" -cmd ".mode insert \"$t\"" "SELECT $cols FROM \"$t\";" >> "$SEED"
done

echo "Wrote $SEED ($(grep -c '^INSERT' "$SEED") insert statements)"
