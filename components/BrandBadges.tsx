"use client";

const BRANDS = [
  "ROYCO", "HIGIENIK", "SEIQ", "ELITE", "CAMPANITA",
  "SAPHIRUS", "SUIZA", "DISPENSADORES ARGENTINOS", "GOOD CREAM",
  "LAFFITTE", "SAMANTHA", "MOPA BS", "MAKE", "DERMOGREEN",
  "ETERNO", "EXTRALIMP", "MARWHIPER", "MYMY", "OPTIMO",
  "PLASTICOS COLORES", "PLASTICOS FLORIDA", "LA PORTEÑA",
  "LIQUIDOS NUESTROS", "CEPILLOS ORTIZ", "CEPILLOS CARIÑO",
  "BOLSAS ISE", "CABOS DE MADERA",
];

export default function BrandBadges() {
  // Duplicamos para el loop infinito CSS
  const doubled = [...BRANDS, ...BRANDS];

  return (
    <section className="brands-section">
      <div className="brands-label">Trabajamos con las mejores marcas</div>
      <div className="brands-track-wrap">
        <div className="brands-track">
          {doubled.map((brand, i) => (
            <span key={i} className="brand-chip">{brand}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
