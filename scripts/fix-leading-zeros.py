"""
Segunda pasada: reintenta los códigos no encontrados quitando el cero inicial.
Códigos: 03→3, 06→6, 01→1, 04→4, 07→7, 08→8, 09→9
"""
import sys, json
import psycopg2
from pathlib import Path
from dotenv import load_dotenv
import os

sys.stdout.reconfigure(encoding='utf-8')

load_dotenv(Path(__file__).parent.parent / ".env")
DB_URL = os.environ["DATABASE_URL"]

REPORT_PATH = Path(__file__).parent / "upload-fotos-report.json"
with open(REPORT_PATH, encoding="utf-8") as f:
    report = json.load(f)

# Índice ts → url desde los ya subidos
url_by_ts = {item["ts"]: item["url"] for item in report.get("uploaded", [])}

not_found = report.get("not_found_in_db", [])
print(f"Códigos a reintentar: {len(not_found)}\n")

conn = psycopg2.connect(DB_URL, sslmode="require")
cur  = conn.cursor()

fixed = []
still_missing = []

for item in not_found:
    code = item["code"]
    ts   = item["ts"]
    url  = url_by_ts.get(ts)

    stripped = code.lstrip("0") or "0"
    print(f"  {code} → {stripped}  (ts={ts})", end=" ")

    if not url:
        print(f"⚠️  URL no encontrada para ts={ts}")
        still_missing.append(code)
        continue

    cur.execute('SELECT id, name FROM "Product" WHERE code = %s', (stripped,))
    row = cur.fetchone()
    if not row:
        print(f"❌ código '{stripped}' no en BD")
        still_missing.append(code)
        continue

    prod_id, prod_name = row
    cur.execute('UPDATE "Product" SET "imageUrl" = %s WHERE id = %s', (url, prod_id))
    conn.commit()
    print(f"✅ [{stripped}] {prod_name}")
    fixed.append({"original": code, "matched": stripped, "name": prod_name, "url": url})

cur.close()
conn.close()

print(f"\n{'='*50}")
print(f"✅ Corregidos: {len(fixed)}")
print(f"❌ Aún sin match: {len(still_missing)} → {still_missing}")

if fixed:
    print("\nProductos actualizados:")
    for f in fixed:
        print(f"  [{f['matched']}] {f['name']}")
