import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/appsync";
import { ALL_APP_IDS } from "@/lib/apps";
import {
  createWebGig,
  isGigCreationConfigured,
  normalizePhone,
  verifyOtp,
} from "@/lib/web-gig";

interface CreateBody {
  prompt?: unknown;
  apps?: unknown;
  title?: unknown;
  phone?: unknown;
  code?: unknown;
  email?: unknown;
}

export async function POST(request: Request) {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "A prompt is required" }, { status: 400 });
  }

  const validIds = new Set(ALL_APP_IDS);
  const apps = Array.isArray(body.apps)
    ? body.apps.filter((id): id is string => typeof id === "string" && validIds.has(id))
    : [];
  const title = typeof body.title === "string" ? body.title : undefined;
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!isGigCreationConfigured()) {
    return NextResponse.json(
      { error: "Gig creation isn't connected yet. Text Gigler to get started.", configured: false },
      { status: 503 },
    );
  }

  // Resolve a verified phone number.
  let phone = "";
  let name: string | undefined;

  if (email) {
    // Logged-in visitor: trust the session, resolve their phone from the User record.
    try {
      const user = await findUserByEmail(email);
      if (user?.phone) {
        phone = user.phone;
        name = user.name || undefined;
      }
    } catch (err) {
      console.error("[GigCreate] Lookup by email failed:", err);
    }
  }

  if (!phone) {
    // Logged-out (or no record yet): require a verified phone via OTP.
    const rawPhone = typeof body.phone === "string" ? body.phone : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    phone = normalizePhone(rawPhone);

    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json({ error: "A phone number is required", needsPhone: true }, { status: 400 });
    }
    if (!code || code.length !== 6) {
      return NextResponse.json({ error: "Enter the 6-digit code we texted you", needsCode: true }, { status: 400 });
    }

    const verified = await verifyOtp(phone, code);
    if (!verified) {
      return NextResponse.json({ error: "That code is invalid or expired", needsCode: true }, { status: 403 });
    }
  }

  try {
    const result = await createWebGig({ prompt, apps, title, phone, name });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[GigCreate] Failed to create gig:", err);
    return NextResponse.json({ error: "Could not create your gig. Please try again." }, { status: 500 });
  }
}
