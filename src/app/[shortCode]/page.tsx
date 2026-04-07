import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { queryByGsi } from "@/lib/dynamo";

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
      { limit: 1 }
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
        <div className="mx-auto max-w-3xl px-6 pb-24">
          <div className="mb-8">
            <Link
              href="/"
              className="text-sm text-brand-muted hover:text-foreground transition"
            >
              &larr; gigler.ai
            </Link>
          </div>
          <div className="rounded-xl border border-brand-border p-8 text-center">
            <div className="text-5xl mb-4">🔍</div>
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

  if (deliverable.publicUrl && (
    deliverable.type === "website" ||
    deliverable.type === "menu" ||
    deliverable.type === "code_project"
  )) {
    redirect(deliverable.publicUrl);
  }

  if (deliverable.publicUrl && deliverable.type === "pdf") {
    redirect(deliverable.publicUrl);
  }

  return (
    <main className="flex-1 pt-24">
      <div className="mx-auto max-w-3xl px-6 pb-24">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-brand-muted hover:text-foreground transition"
          >
            &larr; gigler.ai
          </Link>
        </div>
        <div className="rounded-xl border border-brand-border p-8">
          <h1 className="text-2xl font-bold mb-2">{deliverable.title}</h1>
          <p className="text-brand-muted text-sm mb-4">
            {deliverable.type.replace(/_/g, " ")} &middot; Created {new Date(deliverable.createdAt).toLocaleDateString()}
          </p>
          {deliverable.publicUrl && (
            <a
              href={deliverable.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg bg-brand-primary px-4 py-2 text-sm text-white font-medium hover:opacity-90 transition"
            >
              View Deliverable
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
