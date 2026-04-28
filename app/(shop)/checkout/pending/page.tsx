import Link from "next/link";

export default function PendingPage() {
  return (
    <div className="result-page">
      <div className="result-icon result-icon--pending">⏳</div>
      <h1>Pago pendiente</h1>
      <p>Tu pago está siendo procesado. Esto puede tardar unos minutos.</p>
      <p className="result-sub">Te avisaremos por email cuando se confirme.</p>
      <Link href="/" className="btn-result">Volver al catálogo</Link>
    </div>
  );
}
