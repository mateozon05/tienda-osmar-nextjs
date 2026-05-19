import * as XLSX from "xlsx";

const wb = XLSX.readFile("C:/Users/MATEOZON/Desktop/LISTAS DE PRECIO/MAYORISTA-MAYO-2026.xlsx");
const ws = wb.Sheets["GENERAL"];
const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

// Header row is at index 10: [CODIGO, NOMBRE DEL PRODUCTO, PRECIO]
// Brand rows: row has exactly one non-null string value (col 0), no number in col 0
const brands: string[] = [];
let currentBrand = "";
let brandCounts: Record<string, number> = {};

for (let i = 11; i < rows.length; i++) {
  const r = rows[i];
  const col0 = r[0];
  const col1 = r[1];

  // Brand separator: col0 is a string, col1 is empty/undefined, col2 is empty
  if (typeof col0 === "string" && col0.trim() && !col1 && !r[2]) {
    currentBrand = col0.trim().toUpperCase();
    if (!brandCounts[currentBrand]) {
      brands.push(currentBrand);
      brandCounts[currentBrand] = 0;
    }
  } else if (typeof col0 === "number" && col1) {
    if (currentBrand) brandCounts[currentBrand]++;
  }
}

console.log("Marcas en MAYORISTA:");
brands.forEach((b) => console.log(`  ${b}: ${brandCounts[b]} productos`));
console.log(`\nTotal marcas: ${brands.length}`);
