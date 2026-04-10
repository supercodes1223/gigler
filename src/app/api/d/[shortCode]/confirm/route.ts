import { NextResponse } from "next/server";
import {
  normalizePhone,
  verifyCode,
  signCookie,
  COOKIE_NAME,
  COOKIE_MAX_AGE,
} from "@/lib/deliverable-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;

  let phone: string;
  let code: string;
  try {
    const body = await request.json();
    phone = normalizePhone(body.phone || "");
    code = (body.code || "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!phone || !code || code.length !== 6) {
    return NextResponse.json({ error: "Phone and 6-digit code required" }, { status: 400 });
  }

  const valid = await verifyCode(shortCode, phone, code);
  if (!valid) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 403 });
  }

  const cookieValue = signCookie(shortCode, phone);
  const response = NextResponse.json({ ok: true, message: "Verified" });

  response.cookies.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return response;
}
