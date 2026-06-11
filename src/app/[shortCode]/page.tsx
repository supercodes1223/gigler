"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getUrl } from "aws-amplify/storage";
import { VerifyForm } from "./verify-form";
import { BillsDashboard } from "./bills-dashboard";
import { MediaGallery } from "./media-gallery";

const RESERVED_PATHS = new Set([
  "dashboard", "settings", "pricing", "login", "signup",
  "api", "examples", "about", "careers", "d", "contact",
]);

interface DeliverableMeta {
  title: string;
  type: string;
  createdAt: string;
}

interface MediaItem {
  mediaId: string;
  s3Key: string;
  type: string | null;
  uploadedBy: string | null;
  caption: string | null;
}

interface DeliverableData {
  deliverable: {
    gigId: string;
    deliverableId: string;
    type: string;
    title: string;
    shortCode: string;
    createdAt: string;
    s3Key?: string;
  };
  gig: { title: string; type: string } | null;
  metadata: Record<string, unknown>;
  media: MediaItem[];
}

type PageState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "verify"; meta: DeliverableMeta }
  | { status: "content"; data: DeliverableData };

export default function ShortCodePage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    if (!shortCode || RESERVED_PATHS.has(shortCode)) {
      setState({ status: "not-found" });
      return;
    }

    async function check() {
      try {
        const res = await fetch(`/api/d/${shortCode}`);

        if (res.status === 401) {
          const data = await res.json();
          if (data.code === "AUTH_REQUIRED" && data.title) {
            setState({
              status: "verify",
              meta: { title: data.title, type: data.type, createdAt: data.createdAt },
            });
          } else {
            setState({ status: "not-found" });
          }
          return;
        }

        if (res.status === 404) {
          setState({ status: "not-found" });
          return;
        }

        if (res.ok) {
          const data: DeliverableData = await res.json();
          setState({ status: "content", data });
          return;
        }

        setState({ status: "not-found" });
      } catch {
        setState({ status: "not-found" });
      }
    }

    check();
  }, [shortCode]);

  if (state.status === "loading") {
    return (
      <main className="flex-1 pt-24">
        <div className="mx-auto max-w-sm px-6 pb-24">
          <div className="rounded-xl border border-brand-border p-8 text-center">
            <div className="animate-pulse text-brand-muted">Loading...</div>
          </div>
        </div>
      </main>
    );
  }

  if (state.status === "not-found") {
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

  if (state.status === "verify") {
    const { meta } = state;
    return (
      <main className="flex-1 pt-24">
        <div className="mx-auto max-w-sm px-6 pb-24">
          <div className="mb-8">
            <Link href="/" className="text-sm text-brand-muted hover:text-foreground transition">
              &larr; gigler.ai
            </Link>
          </div>
          <div className="rounded-xl border border-brand-border p-8">
            <h1 className="text-xl font-bold mb-1">{meta.title}</h1>
            <p className="text-brand-muted text-sm mb-6">
              {meta.type.replace(/_/g, " ")}
              {meta.createdAt && (
                <> &middot; {new Date(meta.createdAt).toLocaleDateString()}</>
              )}
            </p>
            <VerifyForm shortCode={shortCode} />
          </div>
        </div>
      </main>
    );
  }

  const { data } = state;
  const delType = data.deliverable.type;

  const mediaItems = data.media || [];

  // File-backed deliverables (sites, menus, PDFs, code pages) live in S3 —
  // open them via a guest-scoped signed URL once access is verified.
  const FILE_BACKED_TYPES = new Set(["website", "menu", "pdf", "code_project", "collage"]);
  if (FILE_BACKED_TYPES.has(delType) && data.deliverable.s3Key) {
    return <FileDeliverableRedirect s3Key={data.deliverable.s3Key} title={data.deliverable.title} />;
  }

  if (delType === "bills_dashboard") {
    const bills = (data.metadata.bills as Record<string, Array<Record<string, unknown>>>) || {};
    const monthlyTotals = (data.metadata.monthlyTotals as Record<string, number>) || {};
    return (
      <BillsDashboard
        title={data.deliverable.title}
        bills={bills as Record<string, Array<{ billType: string; vendor?: string; amount?: number; dueDate?: string; status: string }>>}
        monthlyTotals={monthlyTotals}
        media={mediaItems}
      />
    );
  }

  return (
    <main className="flex-1 pt-24">
      <div className="mx-auto max-w-3xl px-6 pb-24">
        <div className="mb-8">
          <Link href="/" className="text-sm text-brand-muted hover:text-foreground transition">
            &larr; gigler.ai
          </Link>
        </div>
        <div className="rounded-xl border border-brand-border p-8 text-center">
          <h1 className="text-xl font-bold mb-2">{data.deliverable.title}</h1>
          <p className="text-brand-muted text-sm mb-4">
            {delType.replace(/_/g, " ")} &middot;{" "}
            {new Date(data.deliverable.createdAt).toLocaleDateString()}
          </p>
          <p className="text-brand-muted text-sm">
            This deliverable type is not yet viewable in the browser. Please check back soon.
          </p>
        </div>
        {mediaItems.length > 0 && <MediaGallery media={mediaItems} />}
      </div>
    </main>
  );
}

function FileDeliverableRedirect({ s3Key, title }: { s3Key: string; title: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    getUrl({ path: s3Key, options: { validateObjectExistence: true, expiresIn: 3600 } })
      .then((res) => {
        if (mounted) window.location.replace(res.url.toString());
      })
      .catch((err) => {
        console.error("[Deliverable] Failed to resolve file URL:", err);
        if (mounted) setFailed(true);
      });
    return () => {
      mounted = false;
    };
  }, [s3Key]);

  return (
    <main className="flex-1 pt-24">
      <div className="mx-auto max-w-sm px-6 pb-24">
        <div className="rounded-xl border border-brand-border p-8 text-center">
          <h1 className="text-xl font-bold mb-2">{title}</h1>
          <p className="text-brand-muted text-sm">
            {failed
              ? "We couldn't open this deliverable right now. Please try again in a moment."
              : "Opening your deliverable..."}
          </p>
        </div>
      </div>
    </main>
  );
}
