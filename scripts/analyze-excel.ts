import * as XLSX from "xlsx";

const f = "C:/Users/MATEOZON/Desktop/LISTAS DE PRECIO/INSTITUCIONAL-MAYO-2026-1 (1).xlsx";
const wb = XLSX.readFile(f);

for (const sn of ["ELITE", "CAMPANITA", "GOOD CREAM", "SUIZA"]) {
  const ws = wb.Sheets[sn];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(0, 8) as any[][];
  console.log(`\n=== ${sn} ===`);
  rows.forEach((r, i) => console.log(`[${i}]`, JSON.stringify(r)));
}
