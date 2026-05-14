import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production"
);

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
];

// Accessible to both admin and superadmin
const ADMIN_PATHS = [
  "/dashboard",
  "/orders",
  "/users",
  "/clients",
  "/salespersons",
  "/audit",
  "/products",
  "/api/admin/clients",
  "/api/admin/salespersons",
];

// Accessible ONLY to superadmin
const SUPERADMIN_PATHS = [
  "/admins",
  "/settings",
  "/api/admin/admins",
  "/api/admin/settings",
  "/api/admin/price-lists",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Redirect /admin/* → /* ────────────────────────────────────
  if (pathname.startsWith("/admin/") || pathname === "/admin") {
    const newPath = pathname.replace(/^\/admin/, "") || "/dashboard";
    return NextResponse.redirect(new URL(newPath, request.url));
  }

  // ── Allow public paths and static assets ─────────────────────
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/logos") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/logo") ||
    pathname.startsWith("/public") ||
    /\.(png|jpg|jpeg|svg|ico|pdf|webp|gif)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // ── Require auth ─────────────────────────────────────────────
  const token = request.cookies.get("osmar-token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ── Decode token + role-based access ─────────────────────────
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const role = payload.role as string | undefined;

    const isAdmin      = role === "admin" || role === "superadmin";
    const isSuperAdmin = role === "superadmin";

    const isAdminPath = ADMIN_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
    const isSuperAdminPath = SUPERADMIN_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );

    // Rutas accesibles para cualquier usuario autenticado (clientes, admins)
    const AUTH_PATHS = ["/profile", "/api/profile"];
    const isAuthPath = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
    if (isAuthPath) return NextResponse.next();

    // Customers → back to shop
    if ((isAdminPath || isSuperAdminPath) && !isAdmin) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Admin (non-super) trying to access superadmin-only paths → dashboard
    if (isSuperAdminPath && !isSuperAdmin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  } catch {
    // Expired or invalid token
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.set({ name: "osmar-token", value: "", maxAge: 0, path: "/" });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
