import { NextResponse } from "next/server";
import { isSmsConfigured, normalizePhone, sendOtp } from "@/lib/web-gig";

export async function POST(request: Request) {
  let phone: string;
  try {
    const body = (await request.json()) as { phone?: unknown };
    phone = normalizePhone(typeof body.phone === "string" ? body.phone : "");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!phone || phone.replace(/\D/g, "").length < 10) {
    return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
  }

  if (!isSmsConfigured()) {
    return NextResponse.json(
      { error: "Text verification isn't available right now. Try texting Gigler directly." },
      { status: 503 },
    );
  }

  const result = await sendOtp(phone);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || "Could not send verification code" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, message: "Verification code sent" });
}
