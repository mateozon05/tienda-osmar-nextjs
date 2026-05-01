"use client";

import Link from "next/link";
import { useState } from "react";

interface LogoProps {
  variant?: "full" | "icon";
  className?: string;
}

export default function Logo({ variant = "full", className }: LogoProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link href="/" className={`logo${className ? ` ${className}` : ""}`}>
      {!imgError ? (
        <img
          src="/logo-osmar.png"
          alt="Logo Distribuidora Osmar"
          className="logo-img"
          width={44}
          height={44}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="logo-icon" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
            <rect x="10" y="14" width="14" height="13" rx="2.5" fill="white" fillOpacity="0.95" />
            <rect x="13" y="10" width="5" height="5" rx="1" fill="white" fillOpacity="0.85" />
            <rect x="17" y="8" width="6" height="2.5" rx="1.25" fill="white" fillOpacity="0.75" />
            <path d="M13 15 Q10 16 10 19" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <circle cx="25" cy="6" r="1.1" fill="white" fillOpacity="0.9" />
            <circle cx="27" cy="9" r="0.85" fill="white" fillOpacity="0.7" />
          </svg>
        </div>
      )}

      {variant === "full" && (
        <div className="logo-text">
          <div className="logo-name">Osmar</div>
          <div className="logo-sub">Distribuidora</div>
        </div>
      )}
    </Link>
  );
}
