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

// These pages belong to the admin panel (route group (admin))
const ADMIN_PATHS = [
  "/dashboard",
  "/orders",
  "/users",
  "/audit",
  "/settings",
  "/products",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Redirect /admin/* → /* ────────────────────────────────────
  // The (admin) route group doesn't add /admin to URLs.
  // So /admin/dashboard doesn't exist — redirect to /dashboard, etc.
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

    const isAdminPath = ADMIN_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );

    // Customers trying to access admin routes → back to shop
    if (isAdminPath && role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
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
