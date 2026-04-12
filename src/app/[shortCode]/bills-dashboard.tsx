"use client";

import { useState } from "react";
import Link from "next/link";
import { S3Image } from "@/components/S3Image";

interface BillEntry {
  billType: string;
  vendor?: string;
  amount?: number;
  dueDate?: string;
  billingPeriod?: string;
  status: string;
  submittedAt?: string;
  submittedBy?: string;
  paidAt?: string;
  paidBy?: string;
}

interface MediaItem {
  mediaId: string;
  s3Key: string;
  type: string | null;
  uploadedBy: string | null;
  caption: string | null;
}

interface BillsDashboardProps {
  title: string;
  bills: Record<string, BillEntry[]>;
  monthlyTotals: Record<string, number>;
  media?: MediaItem[];
}

function formatCurrency(n?: number): string {
  return n !== undefined ? `$${n.toFixed(2)}` : "\u2014";
}

function formatDate(d?: string): string {
  if (!d) return "\u2014";
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

function monthLabel(key: string): string {
  try {
    const [y, m] = key.split("-");
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return key;
  }
}

function StatusBadge({ status, dueDate }: { status: string; dueDate?: string }) {
  const now = new Date();
  const isOverdue = dueDate && new Date(dueDate) < now;

  if (status === "paid") {
    return (
      <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-500/15 text-green-500">
        Paid
      </span>
    );
  }
  if (status === "submitted" && isOverdue) {
    return (
      <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-500/15 text-red-500">
        Overdue
      </span>
    );
  }
  if (status === "submitted") {
    return (
      <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold bg-yellow-500/15 text-yellow-500">
        Submitted
      </span>
    );
  }
  if (isOverdue) {
    return (
      <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-500/15 text-red-500">
        Overdue
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold bg-zinc-500/15 text-zinc-400">
      Pending
    </span>
  );
}

function BillsTable({
  entries,
  total,
  photos = [],
}: {
  entries: BillEntry[];
  total: number;
  photos?: MediaItem[];
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const hasPhotos = photos.length > 0;

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-brand-muted">Bill</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-brand-muted">Vendor</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-brand-muted">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-brand-muted">Due</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-brand-muted">Status</th>
              {hasPhotos && (
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-brand-muted">Photo</th>
              )}
            </tr>
          </thead>
          <tbody>
            {entries.map((b, i) => {
              const photo = photos[i];
              return (
                <tr key={i} className="border-b border-brand-border last:border-b-0">
                  <td className="px-4 py-3 font-semibold capitalize">{b.billType}</td>
                  <td className="px-4 py-3">{b.vendor || "\u2014"}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{formatCurrency(b.amount)}</td>
                  <td className="px-4 py-3">{formatDate(b.dueDate)}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} dueDate={b.dueDate} /></td>
                  {hasPhotos && (
                    <td className="px-4 py-2">
                      {photo ? (
                        <button
                          onClick={() => setLightbox(photo.s3Key)}
                          className="block rounded-md overflow-hidden border border-brand-border hover:border-purple-500 transition-colors"
                        >
                          <S3Image
                            path={photo.s3Key}
                            alt={photo.caption || `${b.billType} photo`}
                            width={48}
                            height={48}
                            className="sm:w-12 sm:h-12 w-10 h-10 object-cover"
                          />
                        </button>
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md border border-dashed border-brand-border flex items-center justify-center">
                          <svg className="w-4 h-4 text-brand-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          </svg>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-brand-border">
              <td colSpan={2} className="px-4 py-3 font-bold">Total</td>
              <td className="px-4 py-3 font-bold tabular-nums">{formatCurrency(total)}</td>
              <td></td>
              <td></td>
              {hasPhotos && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] max-w-[90vw]">
            <S3Image
              path={lightbox}
              alt="Bill photo"
              width={1200}
              height={900}
              className="max-h-[90vh] max-w-[90vw] object-contain !w-auto !h-auto"
              fadeIn={false}
            />
          </div>
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}

function ComparisonBars({ months, totals }: { months: string[]; totals: Record<string, number> }) {
  const recent = months.slice(0, 6).reverse();
  const maxTotal = Math.max(...Object.values(totals), 1);

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      {recent.map((month) => {
        const total = totals[month] || 0;
        const pct = Math.round((total / maxTotal) * 100);
        const [, m] = month.split("-");
        const short = new Date(2026, parseInt(m) - 1).toLocaleDateString("en-US", { month: "short" });
        return (
          <div key={month} className="mb-2 flex items-center gap-3 last:mb-0">
            <div className="w-10 text-right text-xs text-brand-muted">{short}</div>
            <div className="flex-1 h-6 rounded-md bg-brand-border overflow-hidden">
              <div
                className="h-full rounded-md bg-purple-700 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="w-[70px] text-xs font-semibold tabular-nums">{formatCurrency(total)}</div>
          </div>
        );
      })}
    </div>
  );
}

function PrevMonthSection({
  month,
  entries,
  total,
}: {
  month: string;
  entries: BillEntry[];
  total: number;
}) {
  const [open, setOpen] = useState(false);
  const paidCount = entries.filter((b) => b.status === "paid").length;

  return (
    <div className="mb-3 rounded-xl border border-brand-border bg-brand-surface overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-brand-surface-hover transition"
      >
        <span className="font-semibold">{monthLabel(month)}</span>
        <span className="text-sm text-brand-muted">
          {paidCount}/{entries.length} paid &middot; {formatCurrency(total)}
        </span>
      </button>
      {open && (
        <div className="border-t border-brand-border">
          <BillsTable entries={entries} total={total} />
        </div>
      )}
    </div>
  );
}

export function BillsDashboard({ title, bills, monthlyTotals, media = [] }: BillsDashboardProps) {
  const photos = media.filter((m) => m.type === "photo");
  const months = Object.keys(bills).sort().reverse();
  const currentMonth = months[0] || new Date().toISOString().substring(0, 7);
  const currentBills = bills[currentMonth] || [];
  const currentTotal = monthlyTotals[currentMonth] || 0;
  const paidCount = currentBills.filter((b) => b.status === "paid").length;
  const submittedCount = currentBills.filter((b) => b.status === "submitted").length;
  const pendingCount = currentBills.length - paidCount - submittedCount;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[900px] px-6 py-8">
        <div className="mb-2">
          <Link href="/" className="text-sm text-brand-muted hover:text-foreground transition">
            &larr; gigler.ai
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-brand-muted mt-1">{monthLabel(currentMonth)}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
          <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-brand-muted">Total</div>
            <div className="mt-1 text-2xl font-bold">{formatCurrency(currentTotal)}</div>
          </div>
          <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-brand-muted">Paid</div>
            <div className="mt-1 text-2xl font-bold text-green-500">{paidCount}</div>
          </div>
          <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-brand-muted">Submitted</div>
            <div className="mt-1 text-2xl font-bold text-yellow-500">{submittedCount}</div>
          </div>
          <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-brand-muted">Pending</div>
            <div className={`mt-1 text-2xl font-bold ${pendingCount > 0 ? "text-red-500" : ""}`}>
              {pendingCount}
            </div>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-4">This Month</h2>
        <BillsTable entries={currentBills} total={currentTotal} photos={photos} />

        {months.length > 1 && (
          <>
            <h2 className="text-lg font-semibold mt-8 mb-4">Month-over-Month</h2>
            <ComparisonBars months={months} totals={monthlyTotals} />

            <h2 className="text-lg font-semibold mt-8 mb-4">Previous Months</h2>
            {months.slice(1).map((month) => (
              <PrevMonthSection
                key={month}
                month={month}
                entries={bills[month] || []}
                total={monthlyTotals[month] || 0}
              />
            ))}
          </>
        )}

        <div className="mt-8 border-t border-brand-border pt-8 text-center text-sm text-brand-muted">
          Powered by{" "}
          <Link href="/" className="text-purple-500 hover:text-purple-400 transition">
            Gigler
          </Link>
        </div>
      </div>
    </main>
  );
}
