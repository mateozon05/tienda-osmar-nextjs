"use client";

import Link from "next/link";
import { useState } from "react";

const PHONE_DISPLAY = "+54 9 11 5017-9447";
const PHONE_TEL = "tel:+541150179447";
const WA_LINK = "https://wa.me/541150179447?text=Hola%2C+me+interesa+consultar+sobre+productos+de+limpieza";
const EMAIL = "ventas@distribuidoraosmar.com";
const MAPS_LINK =
  "https://www.google.com/maps/search/?api=1&query=Av.+Caz%C3%B3n+464+Tigre+Buenos+Aires";

// ── Inline SVG icons ──────────────────────────────────────────────────────────
function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}
function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
function MapPinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
function ExternalLinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", marginLeft: 4, verticalAlign: "middle" }}>
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function Footer() {
  const [logoError, setLogoError] = useState(false);
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-inner">

        {/* ── Columna 1: Marca ── */}
        <div className="footer-col footer-brand-col">
          <div className="footer-brand">
            {!logoError ? (
              <img
                src="/logo-osmar.png"
                alt="Distribuidora Osmar"
                className="footer-logo-img"
                width={150}
                height={150}
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="footer-logo-fallback" aria-hidden="true">🏪</div>
            )}
          </div>
          <p className="footer-tagline">
            Distribuidora mayorista de productos de limpieza e higiene para empresas y comercios.
          </p>
          <p className="footer-since">Desde 2010</p>
          <div className="footer-social">
            <a
              href="https://www.instagram.com/distri_osmar/"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-btn"
              aria-label="Instagram"
            >
              <InstagramIcon />
              <span>@distri_osmar</span>
            </a>
            <a
              href="https://facebook.com/distribuidoraosmarlimpieza"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-btn"
              aria-label="Facebook"
            >
              <FacebookIcon />
              <span>@distribuidoraosmarlimpieza</span>
            </a>
          </div>
        </div>

        {/* ── Columna 2: Contacto ── */}
        <div className="footer-col">
          <h4 className="footer-col-title">Contacto</h4>
          <ul className="footer-links">
            <li>
              <a href={PHONE_TEL} className="footer-link">
                <span className="footer-link-icon"><PhoneIcon /></span>
                {PHONE_DISPLAY}
              </a>
            </li>
            <li>
              <a href={`mailto:${EMAIL}`} className="footer-link">
                <span className="footer-link-icon"><MailIcon /></span>
                {EMAIL}
              </a>
            </li>
            <li>
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link footer-link--wa"
                aria-label="Contáctanos por WhatsApp"
              >
                <span className="footer-link-icon"><WhatsAppIcon /></span>
                {PHONE_DISPLAY}
              </a>
            </li>
          </ul>
        </div>

        {/* ── Columna 3: Ubicación ── */}
        <div className="footer-col">
          <h4 className="footer-col-title">Ubicación</h4>
          <ul className="footer-links">
            <li>
              <span className="footer-link footer-link--static">
                <span className="footer-link-icon"><MapPinIcon /></span>
                Av. Cazón 464, Tigre, Buenos Aires
              </span>
            </li>
            <li>
              <span className="footer-link footer-link--static">
                <span className="footer-link-icon"><ClockIcon /></span>
                <span>
                  <span className="footer-hours-row">Lun–Vie&nbsp;&nbsp;8:00 – 18:00 hs</span>
                  <span className="footer-hours-row">Sábados&nbsp;&nbsp;9:00 – 13:00 hs</span>
                  <span className="footer-hours-row footer-closed">Domingos&nbsp;&nbsp;Cerrado</span>
                </span>
              </span>
            </li>
            <li>
              <a href={MAPS_LINK} target="_blank" rel="noopener noreferrer" className="footer-link footer-link--maps">
                <span className="footer-link-icon"><MapPinIcon /></span>
                Ver en Google Maps
                <ExternalLinkIcon />
              </a>
            </li>
          </ul>
        </div>

        {/* ── Columna 4: Legal ── */}
        <div className="footer-col">
          <h4 className="footer-col-title">Información</h4>
          <ul className="footer-links">
            <li><Link href="/terminos" className="footer-link">Términos y condiciones</Link></li>
            <li><Link href="/privacidad" className="footer-link">Política de privacidad</Link></li>
            <li><Link href="/envios" className="footer-link">Envíos y entregas</Link></li>
            <li><Link href="/cambios-devoluciones" className="footer-link">Cambios y devoluciones</Link></li>
          </ul>
        </div>

      </div>

      <div className="footer-bottom">
        <span>© {year} Distribuidora Osmar — Todos los derechos reservados</span>
        <span className="footer-bottom-sep">·</span>
        <span>Tigre, Buenos Aires</span>
      </div>
    </footer>
  );
}
