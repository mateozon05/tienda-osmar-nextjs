"""Analiza la estructura de los PDFs de catalogo."""
import fitz
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

PDF_BASE = r"C:\Users\MATEOZON\Desktop\DO\TIENDA WEB\tienda-osmar-nextjs\public"

pdfs = {
    "suiza": f"{PDF_BASE}/Catalogo-Productos-Suiza-MAYO.pdf",
    "osmar": f"{PDF_BASE}/Catalogo-Distribuidora-Osmar-Mayo.pdf",
}

for name, path in pdfs.items():
    print(f"\n{'='*60}")
    print(f"PDF: {name}")
    doc = fitz.open(path)
    print(f"Paginas: {len(doc)}")

    total_images = 0

    for page_num in range(min(6, len(doc))):
        page = doc[page_num]
        images = page.get_images(full=True)
        total_images += len(images)
        full_text = page.get_text().encode('ascii', errors='replace').decode('ascii')
        codes = re.findall(r'\b\d{4,6}\b', full_text)
        text_preview = full_text[:150].strip().replace('\n', ' ')
        print(f"  Pag {page_num+1}: {len(images)} imgs | codigos: {codes[:8]}")
        print(f"    Texto: {text_preview[:100]}")

    # Count remaining
    for page_num in range(6, len(doc)):
        page = doc[page_num]
        images = page.get_images(full=True)
        total_images += len(images)

    print(f"Total imagenes: {total_images}")
    doc.close()
