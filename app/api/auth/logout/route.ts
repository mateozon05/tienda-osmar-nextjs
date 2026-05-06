import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST() {
  const session = await getSession();

  if (session) {
    await audit({
      action:   "LOGOUT",
      entity:   "User",
      entityId: session.userId,
      userId:   session.userId,
      userName: session.email,
    });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set({ name: "osmar-token", value: "", maxAge: 0, path: "/" });
  return res;
}
