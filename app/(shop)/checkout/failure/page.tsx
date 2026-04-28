import Link from "next/link";

export default function FailurePage() {
  return (
    <div className="result-page">
      <div className="result-icon result-icon--failure">❌</div>
      <h1>Pago rechazado</h1>
      <p>Hubo un problema al procesar tu pago.</p>
      <p className="result-sub">Podés intentarlo de nuevo o elegir otro medio de pago.</p>
      <Link href="/checkout" className="btn-result">Reintentar pago</Link>
    </div>
  );
}
