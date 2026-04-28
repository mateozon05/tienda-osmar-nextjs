import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="result-page">
      <div className="result-icon result-icon--success">✅</div>
      <h1>¡Pago aprobado!</h1>
      <p>Tu pedido fue confirmado y está siendo preparado.</p>
      <p className="result-sub">Te enviamos un email con los detalles de tu compra.</p>
      <Link href="/" className="btn-result">Volver al catálogo</Link>
    </div>
  );
}
