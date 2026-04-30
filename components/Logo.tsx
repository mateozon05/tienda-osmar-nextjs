import Link from "next/link";

interface LogoProps {
  /** "full" = icon + text (default) | "icon" = icon only */
  variant?: "full" | "icon";
  className?: string;
}

export default function Logo({ variant = "full", className }: LogoProps) {
  return (
    <Link href="/" className={`logo${className ? ` ${className}` : ""}`}>
      <div className="logo-icon" aria-hidden="true">
        {/* Spray bottle / cleaning icon */}
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
        >
          {/* Bottle body */}
          <rect x="10" y="14" width="14" height="13" rx="2.5" fill="white" fillOpacity="0.95" />
          {/* Bottle neck */}
          <rect x="13" y="10" width="5" height="5" rx="1" fill="white" fillOpacity="0.85" />
          {/* Nozzle */}
          <rect x="17" y="8" width="6" height="2.5" rx="1.25" fill="white" fillOpacity="0.75" />
          {/* Trigger */}
          <path d="M13 15 Q10 16 10 19" stroke="white" strokeWidth="1.5" strokeLinecap="round" fillOpacity="0" fill="none" />
          {/* Spray dots */}
          <circle cx="25" cy="6" r="1.1" fill="white" fillOpacity="0.9" />
          <circle cx="27" cy="9" r="0.85" fill="white" fillOpacity="0.7" />
          <circle cx="27" cy="5.5" r="0.7" fill="white" fillOpacity="0.55" />
          {/* Label line on bottle */}
          <rect x="12" y="18" width="10" height="1.5" rx="0.75" fill="white" fillOpacity="0.25" />
          <rect x="12" y="21" width="7" height="1.5" rx="0.75" fill="white" fillOpacity="0.25" />
        </svg>
      </div>

      {variant === "full" && (
        <div className="logo-text">
          <div className="logo-name">Osmar</div>
          <div className="logo-sub">Distribuidora</div>
        </div>
      )}
    </Link>
  );
}
