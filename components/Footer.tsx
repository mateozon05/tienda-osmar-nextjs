"use client";

import { useState } from "react";

export default function Footer() {
  const [logoError, setLogoError] = useState(false);
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-inner">

        {/* Brand column */}
        <div className="footer-col footer-brand-col">
          <div className="footer-brand">
            {!logoError ? (
              <img
                src="/logo-osmar.jpg"
                alt="Logo Distribuidora Osmar"
                className="footer-logo-img"
                width={48}
                height={48}
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="footer-logo-icon" aria-hidden="true">
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
                  <rect x="10" y="14" width="14" height="13" rx="2.5" fill="white" fillOpacity="0.95" />
                  <rect x="13" y="10" width="5" height="5" rx="1" fill="white" fillOpacity="0.85" />
                  <rect x="17" y="8" width="6" height="2.5" rx="1.25" fill="white" fillOpacity="0.75" />
                  <path d="M13 15 Q10 16 10 19" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  <circle cx="25" cy="6" r="1.1" fill="white" fillOpacity="0.9" />
                </svg>
              </div>
            )}
            <div>
              <div className="footer-logo-name">Osmar</div>
              <div className="footer-logo-sub">Distribuidora</div>
            </div>
          </div>
          <p className="footer-tagline">
            Artículos de limpieza e higiene para empresas y comercios de la zona norte del GBA.
          </p>
          <div className="footer-social">
            <a href="https://wa.me/5491112345678" target="_blank" rel="noopener noreferrer" className="social-btn social-btn--wa" aria-label="WhatsApp">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>
            <a href="https://instagram.com/distribuidoraosmar" target="_blank" rel="noopener noreferrer" className="social-btn social-btn--ig" aria-label="Instagram">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
              Instagram
            </a>
          </div>
        </div>

        {/* Contacto */}
        <div className="footer-col">
          <h4 className="footer-col-title">Contacto</h4>
          <ul className="footer-links">
            <li><span className="footer-link-icon">📍</span><span>Tigre, Buenos Aires, Argentina</span></li>
            <li>
              <a href="tel:+5491112345678" className="footer-link">
                <span className="footer-link-icon">📞</span>+54 9 11 1234-5678
              </a>
            </li>
            <li>
              <a href="mailto:ventas@distribuidoraosmar.com.ar" className="footer-link">
                <span className="footer-link-icon">✉️</span>ventas@distribuidoraosmar.com.ar
              </a>
            </li>
            <li><span className="footer-link-icon">🕐</span><span>Lun–Vie 8:00–17:00 hs</span></li>
          </ul>
        </div>

        {/* Navegación */}
        <div className="footer-col">
          <h4 className="footer-col-title">Navegación</h4>
          <ul className="footer-links">
            <li><a href="/" className="footer-link">Catálogo</a></li>
            <li><a href="/checkout" className="footer-link">Mi pedido</a></li>
            <li><a href="/#" className="footer-link">Cómo comprar</a></li>
            <li><a href="/#" className="footer-link">Zonas de entrega</a></li>
          </ul>
        </div>

        {/* Legal */}
        <div className="footer-col">
          <h4 className="footer-col-title">Legal</h4>
          <ul className="footer-links">
            <li><a href="/#" className="footer-link">Términos y condiciones</a></li>
            <li><a href="/#" className="footer-link">Política de privacidad</a></li>
            <li><a href="/#" className="footer-link">Devoluciones</a></li>
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
