"""
Extrae imágenes de los PDFs de catálogo, las sube a Cloudinary
y genera un JSON con el mapeo código→URL.
"""
import fitz
import re
import os
import json
import sys
import cloudinary
import cloudinary.uploader
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

# ── Configuración ────────────────────────────────────────────────
CLOUD_NAME = "mateozon05"
API_KEY     = "289125423129944"
API_SECRET  = "8Id12SOaPf-JhEpSMUezR-Lq-Kg"

cloudinary.config(
    cloud_name=CLOUD_NAME,
    api_key=API_KEY,
    api_secret=API_SECRET,
    secure=True,
)

BASE_DIR  = Path(r"C:\Users\MATEOZON\Desktop\DO\TIENDA WEB\tienda-osmar-nextjs")
OUT_DIR   = BASE_DIR / "public" / "product-images"
OUT_DIR.mkdir(parents=True, exist_ok=True)

PDFS = {
    "suiza": BASE_DIR / "public" / "Catalogo-Productos-Suiza-MAYO.pdf",
    "osmar": BASE_DIR / "public" / "Catalogo-Distribuidora-Osmar-Mayo.pdf",
}

MAPPING_FILE = BASE_DIR / "scripts" / "image-mapping.json"
MIN_IMG_SIZE = 5_000   # bytes – ignorar iconos/decoraciones pequeñas

# ── Helpers ──────────────────────────────────────────────────────
CODE_RE = re.compile(r'\bC[oó]d\.?\s*(\d{4,6})\b', re.IGNORECASE)
NUM_RE  = re.compile(r'\b(\d{4,6})\b')


def extract_codes_near_image(page, img_rect):
    """Busca códigos de producto en bloques de texto cercanos a la imagen."""
    blocks = page.get_text("blocks")  # (x0,y0,x1,y1, text, block_no, block_type)
    candidates = []
    for b in blocks:
        bx0, by0, bx1, by1, text, *_ = b
        if not text.strip():
            continue
        # Distancia vertical desde el borde inferior de la imagen
        dist = abs(by0 - img_rect.y1)
        candidates.append((dist, text))

    # Ordenar por proximidad
    candidates.sort(key=lambda x: x[0])
    for _, text in candidates[:6]:
        m = CODE_RE.search(text)
        if m:
            return m.group(1)
    # Fallback: cualquier número de 4-6 dígitos en los bloques más cercanos
    for _, text in candidates[:4]:
        m = NUM_RE.search(text)
        if m:
            return m.group(1)
    return None


def extract_name_near_image(page, img_rect):
    """Busca el nombre de producto más cercano a la imagen."""
    blocks = page.get_text("blocks")
    candidates = []
    for b in blocks:
        bx0, by0, bx1, by1, text, *_ = b
        text = text.strip()
        if not text or len(text) < 5:
            continue
        dist = abs(by0 - img_rect.y1)
        candidates.append((dist, text))
    candidates.sort(key=lambda x: x[0])
    # Devolver el primer bloque que parece un nombre (no solo números)
    for _, text in candidates[:5]:
        if re.search(r'[A-Za-z]{3,}', text):
            return text[:100].replace('\n', ' ')
    return ""


def upload_to_cloudinary(local_path, public_id):
    """Sube imagen a Cloudinary, devuelve URL segura."""
    try:
        result = cloudinary.uploader.upload(
            str(local_path),
            public_id=f"osmar-products/{public_id}",
            overwrite=False,
            resource_type="image",
            quality="auto:good",
            fetch_format="auto",
        )
        return result["secure_url"]
    except Exception as e:
        print(f"    ERROR upload {public_id}: {e}")
        return None


# ── Main ─────────────────────────────────────────────────────────
mapping = {}   # code → url
no_code = []   # imágenes sin código

total_extracted = 0
total_uploaded  = 0

for source, pdf_path in PDFS.items():
    print(f"\n{'='*60}")
    print(f"Procesando: {source} ({pdf_path.name})")
    doc = fitz.open(str(pdf_path))

    for page_num in range(len(doc)):
        page  = doc[page_num]
        images = page.get_images(full=True)
        if not images:
            continue

        for img_idx, img_info in enumerate(images):
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
            except Exception:
                continue

            img_bytes = base_image["image"]
            img_ext   = base_image["ext"]

            # Ignorar imágenes muy pequeñas (logos, iconos)
            if len(img_bytes) < MIN_IMG_SIZE:
                continue

            # Obtener rect de la imagen en la página
            img_rect = None
            for item in page.get_image_info():
                if item.get("xref") == xref:
                    r = item["bbox"]
                    img_rect = fitz.Rect(r)
                    break
            if img_rect is None:
                img_rect = page.rect  # fallback

            # Buscar código de producto
            code = extract_codes_near_image(page, img_rect)

            # Nombre del archivo
            if code:
                file_name = f"{source}_{code}_{img_idx}.{img_ext}"
                public_id = f"{source}_{code}"
            else:
                file_name = f"{source}_p{page_num+1:03d}_i{img_idx}.{img_ext}"
                public_id = f"{source}_p{page_num+1:03d}_i{img_idx}"

            # Guardar localmente
            local_path = OUT_DIR / file_name
            with open(local_path, "wb") as f:
                f.write(img_bytes)
            total_extracted += 1

            # Subir a Cloudinary
            print(f"  [{total_extracted:4d}] pag {page_num+1} | code={code or 'N/A':>7} | {file_name[:50]}", end=" ")
            url = upload_to_cloudinary(local_path, public_id)
            if url:
                total_uploaded += 1
                print(f"✓")
                if code:
                    # Si ya existe, no pisamos (puede haber imágenes duplicadas de la misma pag)
                    if code not in mapping:
                        mapping[code] = url
                else:
                    no_code.append({"file": file_name, "url": url})
            else:
                print(f"✗")

    doc.close()

# Guardar mapping
with open(MAPPING_FILE, "w", encoding="utf-8") as f:
    json.dump({"by_code": mapping, "no_code": no_code}, f, indent=2, ensure_ascii=False)

print(f"\n{'='*60}")
print(f"Extraidas:  {total_extracted}")
print(f"Subidas:    {total_uploaded}")
print(f"Con codigo: {len(mapping)}")
print(f"Sin codigo: {len(no_code)}")
print(f"Mapping guardado en: {MAPPING_FILE}")
