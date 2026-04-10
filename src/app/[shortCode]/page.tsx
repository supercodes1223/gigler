import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { queryByGsi } from "@/lib/dynamo";
import { verifyCookie, COOKIE_NAME } from "@/lib/deliverable-auth";
import { VerifyForm } from "./verify-form";

interface PageProps {
  params: Promise<{ shortCode: string }>;
}

const RESERVED_PATHS = new Set([
  "dashboard", "settings", "pricing", "login", "signup",
  "api", "examples", "about", "careers", "d",
]);

const DELIVERABLE_TABLE =
  process.env.DELIVERABLE_TABLE_NAME ||
  "Deliverable-v7rrpmhbmbgzjmwqpeflaw2rra-NONE";

interface Deliverable {
  gigId: string;
  deliverableId: string;
  type: string;
  title: string;
  s3Key: string;
  publicUrl: string;
  shortCode: string;
  createdAt: string;
}

async function getDeliverableByShortCode(shortCode: string): Promise<Deliverable | null> {
  try {
    const results = await queryByGsi<Deliverable>(
      DELIVERABLE_TABLE,
      "byShortCode",
      "shortCode",
      shortCode,
      { limit: 1 },
    );
    return results[0] || null;
  } catch (err) {
    console.error("[ShortCode] Failed to look up deliverable:", err);
    return null;
  }
}

export default async function ShortCodePage({ params }: PageProps) {
  const { shortCode } = await params;

  if (RESERVED_PATHS.has(shortCode)) notFound();

  const deliverable = await getDeliverableByShortCode(shortCode);

  if (!deliverable) {
    return (
      <main className="flex-1 pt-24">
        <div className="mx-auto max-w-sm px-6 pb-24">
          <div className="mb-8">
            <Link href="/" className="text-sm text-brand-muted hover:text-foreground transition">
              &larr; gigler.ai
            </Link>
          </div>
          <div className="rounded-xl border border-brand-border p-8 text-center">
            <h1 className="text-2xl font-bold mb-2">Not Found</h1>
            <p className="text-brand-muted">
              This link doesn&apos;t match any deliverable. It may have expired or the code is incorrect.
            </p>
            <p className="text-sm text-brand-muted mt-4">
              Code: <code className="bg-brand-surface px-2 py-0.5 rounded">{shortCode}</code>
            </p>
          </div>
        </div>
      </main>
    );
  }

  const cookieStore = await cookies();
  const accessCookie = cookieStore.get(COOKIE_NAME)?.value;
  const isVerified = accessCookie ? verifyCookie(accessCookie, shortCode) : false;

  if (isVerified) {
    const hasValidHttpUrl = deliverable.publicUrl?.startsWith("http");
    if (hasValidHttpUrl) {
      redirect(deliverable.publicUrl);
    }
    if (deliverable.s3Key) {
      redirect(`/api/d/${shortCode}`);
    }
  }

  return (
    <main className="flex-1 pt-24">
      <div className="mx-auto max-w-sm px-6 pb-24">
        <div className="mb-8">
          <Link href="/" className="text-sm text-brand-muted hover:text-foreground transition">
            &larr; gigler.ai
          </Link>
        </div>
        <div className="rounded-xl border border-brand-border p-8">
          <h1 className="text-xl font-bold mb-1">{deliverable.title}</h1>
          <p className="text-brand-muted text-sm mb-6">
            {deliverable.type.replace(/_/g, " ")}
            {deliverable.createdAt && (
              <> &middot; {new Date(deliverable.createdAt).toLocaleDateString()}</>
            )}
          </p>
          <VerifyForm shortCode={shortCode} />
        </div>
      </div>
    </main>
  );
}
