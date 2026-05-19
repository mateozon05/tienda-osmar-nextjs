"""
Sube las imágenes ya extraídas a Cloudinary y genera image-mapping.json.
"""
import re
import json
import sys
import cloudinary
import cloudinary.uploader
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

CLOUD_NAME = "dq1wgq8ad"
API_KEY    = "289125423129944"
API_SECRET = "8Id12SOaPf-JhEpSMUezR-Lq-Kg"

cloudinary.config(
    cloud_name=CLOUD_NAME,
    api_key=API_KEY,
    api_secret=API_SECRET,
    secure=True,
)

BASE_DIR     = Path(r"C:\Users\MATEOZON\Desktop\DO\TIENDA WEB\tienda-osmar-nextjs")
IMG_DIR      = BASE_DIR / "public" / "product-images"
MAPPING_FILE = BASE_DIR / "scripts" / "image-mapping.json"

# Patrón: suiza_11891_0.jpeg  o  suiza_p001_i0.jpeg
CODE_FROM_NAME = re.compile(r'^(suiza|osmar)_(\d{4,6})_\d+\.')

images = sorted(IMG_DIR.glob("*.jpeg")) + sorted(IMG_DIR.glob("*.png")) + sorted(IMG_DIR.glob("*.jpg"))
print(f"Imagenes encontradas: {len(images)}")

mapping   = {}   # code -> url (solo 1 url por código)
no_code   = []
uploaded  = 0
skipped   = 0
errors    = 0

for i, img_path in enumerate(images, 1):
    fname = img_path.name
    m = CODE_FROM_NAME.match(fname)

    if m:
        source = m.group(1)
        code   = m.group(2)
        public_id = f"osmar-products/{source}_{code}"

        # Si ya tenemos URL para este código, saltamos duplicados
        if code in mapping:
            skipped += 1
            continue
    else:
        public_id = f"osmar-products/{img_path.stem}"
        code = None

    print(f"  [{i:4d}/{len(images)}] {fname[:50]:<52}", end=" ")

    try:
        result = cloudinary.uploader.upload(
            str(img_path),
            public_id=public_id,
            overwrite=False,
            resource_type="image",
            quality="auto:good",
            fetch_format="auto",
        )
        url = result["secure_url"]
        uploaded += 1
        print("✓")
        if code:
            mapping[code] = url
        else:
            no_code.append({"file": fname, "url": url})
    except Exception as e:
        errors += 1
        print(f"✗ {e}")

with open(MAPPING_FILE, "w", encoding="utf-8") as f:
    json.dump({"by_code": mapping, "no_code": no_code}, f, indent=2, ensure_ascii=False)

print(f"\n{'='*60}")
print(f"Subidas:      {uploaded}")
print(f"Saltadas:     {skipped} (duplicados del mismo codigo)")
print(f"Errores:      {errors}")
print(f"Con codigo:   {len(mapping)}")
print(f"Sin codigo:   {len(no_code)}")
print(f"Mapping:      {MAPPING_FILE}")
