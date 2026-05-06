import { Resend } from "resend";

// Lazy init — avoids build-time crash when RESEND_API_KEY is not set
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_ADMIN = "Tienda Osmar <noreply@distribuidoraosmar.com>";
const FROM_USER  = "Distribuidora Osmar <noreply@distribuidoraosmar.com>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "ventas@distribuidoraosmar.com";
const STORE_URL   = process.env.NEXT_PUBLIC_URL ?? "https://tienda-osmar-nextjs.vercel.app";

const BASE_STYLES = `font-family:'DM Sans',Arial,sans-serif;max-width:500px;margin:0 auto;`;
const FOOTER_HTML = `<p style="color:#9CA3AF;font-size:12px;text-align:center;margin-top:16px;">
  Distribuidora Osmar · Av. Cazón 464, Tigre · +54 9 11 5017-9447
</p>`;

function header(title: string, bg = "#FF751F") {
  return `<div style="background:${bg};padding:24px;border-radius:12px 12px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:20px;">${title}</h1>
  </div>`;
}
function body(content: string) {
  return `<div style="background:#fff;padding:24px;border:1px solid #E5E7EB;border-radius:0 0 12px 12px;">${content}</div>`;
}
function btn(text: string, href: string, bg = "#FF751F") {
  return `<div style="margin-top:24px;">
    <a href="${href}" style="background:${bg};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${text}</a>
  </div>`;
}

// ── Notify admin: new pending user ──────────────────────────────
export async function notifyNewUserPending(user: {
  name: string; email: string; company?: string | null;
}) {
  const resend = getResend();
  if (!resend) return;
  try {
    await resend.emails.send({
      from: FROM_ADMIN,
      to: ADMIN_EMAIL,
      subject: `🔔 Nuevo usuario pendiente de aprobación — ${user.name}`,
      html: `<div style="${BASE_STYLES}">
        ${header("Nuevo usuario registrado")}
        ${body(`
          <p style="color:#6B7280;margin-bottom:16px;">Un nuevo usuario se registró y está esperando aprobación:</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px;color:#6B7280;font-size:13px;">Nombre:</td><td style="padding:8px;font-weight:600;">${user.name}</td></tr>
            <tr><td style="padding:8px;color:#6B7280;font-size:13px;">Email:</td><td style="padding:8px;">${user.email}</td></tr>
            <tr><td style="padding:8px;color:#6B7280;font-size:13px;">Empresa:</td><td style="padding:8px;">${user.company ?? "No especificada"}</td></tr>
          </table>
          ${btn("Aprobar / Rechazar →", `${STORE_URL}/users`)}
        `)}
        ${FOOTER_HTML}
      </div>`,
    });
  } catch (err) {
    console.error("[email] notifyNewUserPending:", err);
  }
}

// ── Notify user: account approved ───────────────────────────────
export async function notifyUserApproved(user: {
  name: string; email: string; priceListName: string;
}) {
  const resend = getResend();
  if (!resend) return;
  try {
    await resend.emails.send({
      from: FROM_USER,
      to: user.email,
      subject: "✅ Tu cuenta fue aprobada — Distribuidora Osmar",
      html: `<div style="${BASE_STYLES}">
        ${header("¡Tu cuenta fue aprobada!")}
        ${body(`
          <p>Hola <strong>${user.name}</strong>,</p>
          <p style="color:#6B7280;">Tu cuenta en Distribuidora Osmar fue aprobada. Ya podés ingresar y ver el catálogo completo con tus precios asignados.</p>
          <div style="background:#F0FDF4;border-radius:8px;padding:12px 16px;margin:16px 0;">
            <p style="color:#065F46;margin:0;font-size:14px;">💰 Lista de precios asignada: <strong>${user.priceListName}</strong></p>
          </div>
          ${btn("Ingresar a la tienda →", `${STORE_URL}/login`)}
        `)}
        ${FOOTER_HTML}
      </div>`,
    });
  } catch (err) {
    console.error("[email] notifyUserApproved:", err);
  }
}

// ── Notify user: account rejected ───────────────────────────────
export async function notifyUserRejected(user: {
  name: string; email: string;
}) {
  const resend = getResend();
  if (!resend) return;
  try {
    await resend.emails.send({
      from: FROM_USER,
      to: user.email,
      subject: "Tu solicitud de cuenta — Distribuidora Osmar",
      html: `<div style="${BASE_STYLES}">
        ${header("Solicitud de cuenta", "#1A1A2E")}
        ${body(`
          <p>Hola <strong>${user.name}</strong>,</p>
          <p style="color:#6B7280;">En este momento no podemos activar tu cuenta. Para más información contactanos directamente:</p>
          ${btn("Contactar por WhatsApp →", "https://wa.me/541150179447", "#25D366")}
        `)}
        ${FOOTER_HTML}
      </div>`,
    });
  } catch (err) {
    console.error("[email] notifyUserRejected:", err);
  }
}

// ── Notify admin: new order ──────────────────────────────────────
export async function notifyNewOrder(order: {
  id: number; userName: string; total: number; itemCount: number;
}) {
  const resend = getResend();
  if (!resend) return;
  try {
    await resend.emails.send({
      from: FROM_ADMIN,
      to: ADMIN_EMAIL,
      subject: `🛒 Nuevo pedido #${order.id} — $${order.total.toLocaleString("es-AR")}`,
      html: `<div style="${BASE_STYLES}">
        ${header(`Nuevo pedido #${order.id}`)}
        ${body(`
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px;color:#6B7280;font-size:13px;">Pedido #:</td><td style="padding:8px;font-weight:600;">${order.id}</td></tr>
            <tr><td style="padding:8px;color:#6B7280;font-size:13px;">Cliente:</td><td style="padding:8px;">${order.userName}</td></tr>
            <tr><td style="padding:8px;color:#6B7280;font-size:13px;">Productos:</td><td style="padding:8px;">${order.itemCount} item${order.itemCount !== 1 ? "s" : ""}</td></tr>
            <tr><td style="padding:8px;color:#6B7280;font-size:13px;">Total:</td><td style="padding:8px;font-weight:600;color:#FF751F;font-size:18px;">$${order.total.toLocaleString("es-AR")}</td></tr>
          </table>
          ${btn("Ver pedido →", `${STORE_URL}/orders/${order.id}`)}
        `)}
        ${FOOTER_HTML}
      </div>`,
    });
  } catch (err) {
    console.error("[email] notifyNewOrder:", err);
  }
}
