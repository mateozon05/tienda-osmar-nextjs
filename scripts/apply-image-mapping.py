"""
Lee el mapping código→URL generado por extract-and-upload.py
y actualiza imageUrl en los productos de la BD.
"""
import json
import sys
import os
import psycopg2
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

DB_URL = "postgresql://neondb_owner:npg_go7GwqCPy3Sh@ep-lingering-cloud-acn1ydhh.sa-east-1.aws.neon.tech/neondb?sslmode=require"
MAPPING_FILE = Path(r"C:\Users\MATEOZON\Desktop\DO\TIENDA WEB\tienda-osmar-nextjs\scripts\image-mapping.json")

if not MAPPING_FILE.exists():
    print("ERROR: image-mapping.json no encontrado. Ejecuta primero extract-and-upload.py")
    sys.exit(1)

with open(MAPPING_FILE, encoding="utf-8") as f:
    data = json.load(f)

mapping = data["by_code"]  # code (str) -> url
print(f"Mapping cargado: {len(mapping)} codigos con imagen")

conn = psycopg2.connect(DB_URL)
cur  = conn.cursor()

updated = 0
not_found = 0
skipped = 0

for code, url in mapping.items():
    cur.execute('SELECT id, "imageUrl" FROM "Product" WHERE code = %s', (code,))
    row = cur.fetchone()
    if row is None:
        not_found += 1
        continue
    pid, existing_url = row
    if existing_url:
        skipped += 1
        continue
    cur.execute('UPDATE "Product" SET "imageUrl" = %s WHERE id = %s', (url, pid))
    updated += 1

conn.commit()
cur.close()
conn.close()

print(f"\nResultados:")
print(f"  Actualizados: {updated}")
print(f"  Ya tenian imagen (saltados): {skipped}")
print(f"  Codigo no encontrado en BD: {not_found}")
print(f"  Total procesados: {len(mapping)}")
