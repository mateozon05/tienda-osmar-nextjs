"use client";

const FEATURES = [
  {
    icon: "🚚",
    title: "Envíos a domicilio",
    desc: "Entregamos en toda la zona norte del GBA. Coordina tu pedido y lo llevamos directo a tu negocio.",
  },
  {
    icon: "💰",
    title: "Precios mayoristas",
    desc: "Trabajamos con precios de distribuidor para empresas, comercios e instituciones.",
  },
  {
    icon: "🏷️",
    title: "Más de 32 marcas",
    desc: "Royco, Saphirus, SEIQ, Higienik, Elite, Suiza y muchas más en un solo lugar.",
  },
  {
    icon: "📞",
    title: "Atención personalizada",
    desc: "Nuestro equipo te asesora para encontrar el producto ideal para tu negocio.",
  },
];

export default function QuienesSomos() {
  return (
    <section className="quienes-somos">
      <div className="qs-inner">
        <div className="qs-header">
          <h2 className="qs-title">¿Por qué elegirnos?</h2>
          <p className="qs-sub">
            Somos distribuidores mayoristas con años de experiencia en el rubro de limpieza e higiene,
            atendiendo empresas y comercios de Tigre y la zona norte del GBA.
          </p>
        </div>

        <div className="qs-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="qs-card">
              <div className="qs-card-icon">{f.icon}</div>
              <h3 className="qs-card-title">{f.title}</h3>
              <p className="qs-card-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
