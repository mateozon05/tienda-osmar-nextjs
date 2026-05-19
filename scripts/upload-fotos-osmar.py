"""
Upload FOTOS OSMAR a Cloudinary y actualiza BD.
Mapeo extraido por Claude Vision — sin API externa necesaria.
"""
import sys, json, time
import cloudinary
import cloudinary.uploader
import psycopg2
from pathlib import Path
from dotenv import load_dotenv
import os

sys.stdout.reconfigure(encoding='utf-8')

# ── Credenciales ────────────────────────────────────────────
CLOUD_NAME = "dq1wgq8ad"
API_KEY    = "289125423129944"
API_SECRET = "8Id12SOaPf-JhEpSMUezR-Lq-Kg"

cloudinary.config(cloud_name=CLOUD_NAME, api_key=API_KEY, api_secret=API_SECRET, secure=True)

# ── Ruta de fotos ────────────────────────────────────────────
PHOTOS_DIR = Path(r"C:\Users\MATEOZON\Desktop\Nueva carpeta (4)\FOTOS OSMAR")

# ── DB ───────────────────────────────────────────────────────
load_dotenv(Path(__file__).parent.parent / ".env")
DB_URL = os.environ["DATABASE_URL"]

# ── Mapeo completo extraído por visión ────────────────────────
# { "timestamp_en_nombre": ["cod1", "cod2", ...] }
MAPPING = {
    "104424": ["11989"],
    "104427": ["11988"],
    "104434": ["38"],
    "104436": ["15"],
    "104441": ["59"],
    "104445": ["20"],
    "104454": ["16"],
    "104457": ["60"],
    "104504": ["13"],
    "104509": ["14"],
    "104512": ["37"],
    "104517": ["54"],
    "104522": ["12258"],
    "104526": ["12259"],
    "104530": ["61"],
    "104533": ["212"],
    "104538": ["163"],
    "104541": ["18"],
    "104544": ["7014"],
    "104547": ["9147"],
    "104550": ["122"],
    "104554": ["112"],
    "104559": ["03"],
    "105011": ["06"],
    "105015": ["241"],
    "105020": ["229"],
    "105024": ["51"],
    "105026": ["12084"],
    "105030": ["172"],
    "105034": ["01"],
    "105038": ["49"],
    "105042": ["04"],
    "105054": ["12086"],
    "105058": ["12085"],
    "105103": ["07"],
    "105107": ["08"],
    "105111": ["09"],
    "105115": ["363"],
    "105118": ["327"],
    "105121": ["9414"],
    "105126": ["9412"],
    "105130": ["9413"],
    "105135": ["11755"],
    "105140": ["9421"],
    "105145": ["9422"],
    "105150": ["11"],
    "105154": ["65"],
    "105158": ["7036"],
    "105203": ["217"],
    "105208": ["818"],
    "105214": ["119"],
    "105218": ["246"],
    "105221": ["9373"],
    "105225": ["9372"],
    "105230": ["26"],
    "105233": ["30"],
    "105237": ["9324"],
    "105241": ["9343", "9344"],
    "105246": ["11680"],
    "105250": ["346"],
    "105254": ["9325"],
    "105315": ["138", "180", "81"],
    "105318": ["9342", "755"],
    "105322": ["9323"],
    "105326": ["736"],
    "105329": ["11487"],
    "105332": ["446"],
    "105339": ["438"],
    "105343": ["439"],
    "105346": ["22"],
    "105351": ["9484"],
    "105355": ["434"],
    "105401": ["12061"],
    "105405": ["27"],
    "105408": ["430"],
    "105411": ["431", "432", "433"],
    "105414": ["393"],
    "105418": ["435", "436", "437", "218"],
    "105421": ["394"],
    "105435": ["429"],
    "105438": ["456"],
    "105510": ["47"],
    "105513": ["738"],
    "105519": ["612"],
    "105523": ["150", "98", "219"],
    "105527": ["12280"],
    "105531": ["9465"],
    "105535": ["9400"],
    "105539": ["383"],
    "105544": ["11930"],
    "105547": ["11926"],
    "105550": ["11925"],
    "105552": ["11922"],
    "105555": ["11923"],
    "105558": ["11924"],
    "105601": ["11928"],
    "105604": ["11929"],
    "105607": ["12338"],
    "105611": ["11141"],
    "105614": ["11144"],
    "105617": ["11143"],
    "105621": ["152"],
    "105625": ["11812"],
    "105629": ["384"],
    "105851": ["288", "282", "281"],
    "105855": ["427"],
    "105859": ["448"],
    "105903": ["421"],
    "105906": ["23"],
    "105910": ["279"],
    "105916": ["223"],
    "105918": ["9321"],
    "110118": ["25"],
    "110124": ["12289"],
    "110128": ["382"],
    "110132": ["7020"],
    "110137": ["9245"],
    "110140": ["12168"],
    "110143": ["191"],
    "110146": ["283", "284"],
    "110152": ["183"],
    "110155": ["2085", "2088", "2090"],
    "110200": ["67"],
    "110203": ["110"],
    "110207": ["220"],
    "110211": ["748"],
    "110214": ["608"],
    "110219": ["9179"],
    "110223": ["9180"],
    "110228": ["416"],
    "110231": ["91"],
    "110235": ["278"],
    "110239": ["12270"],
    "110243": ["286"],
    "110247": ["756"],
    "110252": ["247"],
    "110255": ["233"],
    "110315": ["415"],
    "110319": ["751"],
    "110323": ["11115"],
    "110327": ["137"],
    "110329": ["165"],
    "110333": ["89"],
    "110338": ["478"],
    "110341": ["209"],
    "110344": ["289"],
    "110347": ["198"],
    "110351": ["214"],
    "110354": ["373"],
    "110357": ["224"],
}

def get_file_for_ts(ts: str) -> Path | None:
    """Busca el archivo PNG que contiene el timestamp en el nombre."""
    matches = list(PHOTOS_DIR.glob(f"*{ts}*.png"))
    return matches[0] if matches else None

def main():
    conn = psycopg2.connect(DB_URL, sslmode="require")
    cur  = conn.cursor()

    results = {"uploaded": [], "db_updated": [], "not_found_in_db": [], "upload_error": [], "file_missing": []}
    total = len(MAPPING)

    print(f"\n📸 Procesando {total} fotos → {sum(len(v) for v in MAPPING.values())} productos\n")

    for i, (ts, codes) in enumerate(MAPPING.items(), 1):
        img_path = get_file_for_ts(ts)
        if not img_path:
            print(f"[{i:3d}/{total}] ⚠️  Archivo no encontrado para timestamp {ts}")
            results["file_missing"].append(ts)
            continue

        print(f"[{i:3d}/{total}] {img_path.name} → códigos {codes}")

        # 1. Upload a Cloudinary (una sola vez por foto)
        public_id = f"osmar-products/fotos_{ts}"
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
            print(f"         ☁️  Subido: {url}")
            results["uploaded"].append({"ts": ts, "url": url})
        except Exception as e:
            print(f"         ❌ Error upload: {e}")
            results["upload_error"].append({"ts": ts, "error": str(e)})
            continue

        # 2. Actualizar BD para cada código
        for code in codes:
            cur.execute("SELECT id, name FROM \"Product\" WHERE code = %s", (code,))
            row = cur.fetchone()
            if not row:
                print(f"         ⚠️  Código {code} no encontrado en BD")
                results["not_found_in_db"].append({"ts": ts, "code": code})
                continue

            prod_id, prod_name = row
            cur.execute("UPDATE \"Product\" SET \"imageUrl\" = %s WHERE id = %s", (url, prod_id))
            conn.commit()
            print(f"         ✅ BD actualizada: [{code}] {prod_name}")
            results["db_updated"].append({"code": code, "name": prod_name, "url": url})

        time.sleep(0.3)  # rate-limit suave

    cur.close()
    conn.close()

    # Reporte final
    print("\n" + "="*60)
    print("📊 REPORTE FINAL")
    print("="*60)
    print(f"  ☁️  Fotos subidas:          {len(results['uploaded'])}")
    print(f"  ✅ Productos actualizados:  {len(results['db_updated'])}")
    print(f"  ⚠️  Códigos no en BD:       {len(results['not_found_in_db'])}")
    print(f"  ❌ Errores de upload:       {len(results['upload_error'])}")
    print(f"  📁 Archivos no encontrados: {len(results['file_missing'])}")
    print("="*60)

    report_path = Path(__file__).parent / "upload-fotos-report.json"
    report_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n📄 Reporte guardado en: {report_path}\n")

if __name__ == "__main__":
    main()
