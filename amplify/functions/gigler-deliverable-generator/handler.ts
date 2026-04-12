/**
 * Gigler Deliverable Generator
 *
 * Creates tangible outputs: PDFs, web pages, code projects, collages.
 * Each deliverable gets a unique short URL (6-char alphanumeric).
 *
 * Invocation: Direct Lambda from gig-processor.
 * Event: { gigId, userId, type, title, content, phone }
 */

import type { Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const s3 = new S3Client({});

const DELIVERABLE_TABLE_NAME = process.env.DELIVERABLE_TABLE_NAME || "";
const GIG_TABLE_NAME = process.env.GIG_TABLE_NAME || "";
const MEDIA_TABLE_NAME = process.env.MEDIA_TABLE_NAME || "";
const S3_BUCKET_NAME = process.env.STORAGE_AMPLIFYGENFILES_BUCKETNAME || process.env.S3_BUCKET_NAME || "";
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gigler.ai";

const RESERVED_PATHS = new Set([
  "dashboard", "settings", "pricing", "login", "signup", "api", "examples",
  "d", "admin", "billing", "help", "support",
]);

interface TraceContext { traceId: string; requestId: string; source: string; }

function generateTraceId(): string {
  return `trc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

function createLogger(ctx: TraceContext & { gigId?: string; userId?: string }) {
  const emit = (level: string, message: string, data?: Record<string, unknown>) => {
    const entry = {
      level, ts: new Date().toISOString(),
      traceId: ctx.traceId, requestId: ctx.requestId, source: ctx.source,
      gigId: ctx.gigId, userId: ctx.userId,
      message, ...(data && { data }),
    };
    if (level === "ERROR") console.error(JSON.stringify(entry));
    else if (level === "WARN") console.warn(JSON.stringify(entry));
    else console.log(JSON.stringify(entry));
  };
  return {
    info: (msg: string, data?: Record<string, unknown>) => emit("INFO", msg, data),
    warn: (msg: string, data?: Record<string, unknown>) => emit("WARN", msg, data),
    error: (msg: string, data?: Record<string, unknown>) => emit("ERROR", msg, data),
  };
}

interface DeliverableEvent {
  gigId: string;
  userId: string;
  type: "pdf" | "website" | "menu" | "collage" | "code_project" | "bills_dashboard";
  title: string;
  content: string;
  phone: string;
  _trace?: TraceContext;
}

function generateShortCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return RESERVED_PATHS.has(code) ? generateShortCode() : code;
}

async function isShortCodeTaken(shortCode: string): Promise<boolean> {
  if (!DELIVERABLE_TABLE_NAME) return false;
  const result = await ddb.send(
    new QueryCommand({
      TableName: DELIVERABLE_TABLE_NAME,
      IndexName: "byShortCode",
      KeyConditionExpression: "shortCode = :sc",
      ExpressionAttributeValues: { ":sc": shortCode },
      Limit: 1,
    })
  );
  return (result.Items?.length || 0) > 0;
}

async function getUniqueShortCode(): Promise<string> {
  let code = generateShortCode();
  let attempts = 0;
  while (await isShortCodeTaken(code) && attempts < 10) {
    code = generateShortCode();
    attempts++;
  }
  return code;
}

async function uploadToS3(key: string, body: string | Buffer, contentType: string): Promise<string> {
  if (!S3_BUCKET_NAME) return "";
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return CLOUDFRONT_DOMAIN ? `https://${CLOUDFRONT_DOMAIN}/${key}` : `s3://${S3_BUCKET_NAME}/${key}`;
}

async function generatePdfContent(title: string, content: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 60;
  const usableWidth = pageWidth - margin * 2;
  const bodyFontSize = 11;
  const titleFontSize = 22;
  const lineHeight = bodyFontSize * 1.5;
  const footerFontSize = 8;

  const wrapText = (text: string, font: typeof helvetica, fontSize: number, maxWidth: number): string[] => {
    const lines: string[] = [];
    const paragraphs = text.split(/\n/);
    for (const para of paragraphs) {
      if (para.trim() === "") { lines.push(""); continue; }
      const words = para.split(/\s+/);
      let current = "";
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(test, fontSize) > maxWidth) {
          if (current) lines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
    }
    return lines;
  };

  const bodyLines = wrapText(content, helvetica, bodyFontSize, usableWidth);
  const linesPerPage = Math.floor((pageHeight - margin * 2 - 80) / lineHeight);
  const totalPages = Math.max(1, Math.ceil(bodyLines.length / linesPerPage));

  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const page = doc.addPage([pageWidth, pageHeight]);
    let yPos = pageHeight - margin;

    if (pageNum === 0) {
      page.drawText(title, {
        x: margin, y: yPos - titleFontSize,
        font: helveticaBold, size: titleFontSize, color: rgb(0.06, 0.09, 0.16),
      });
      yPos -= titleFontSize + 20;
      page.drawLine({
        start: { x: margin, y: yPos },
        end: { x: pageWidth - margin, y: yPos },
        thickness: 1, color: rgb(0.8, 0.84, 0.88),
      });
      yPos -= 20;
    }

    const startLine = pageNum === 0 ? 0 : linesPerPage * pageNum - 3;
    const endLine = Math.min(startLine + linesPerPage, bodyLines.length);

    for (let i = startLine; i < endLine; i++) {
      if (yPos < margin + 30) break;
      page.drawText(bodyLines[i], {
        x: margin, y: yPos, font: helvetica, size: bodyFontSize, color: rgb(0.15, 0.15, 0.15),
      });
      yPos -= lineHeight;
    }

    const footer = `Generated by Gigler  |  Page ${pageNum + 1} of ${totalPages}`;
    const footerWidth = helvetica.widthOfTextAtSize(footer, footerFontSize);
    page.drawText(footer, {
      x: (pageWidth - footerWidth) / 2, y: 30,
      font: helvetica, size: footerFontSize, color: rgb(0.5, 0.5, 0.5),
    });
  }

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

function generateHtmlPage(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Gigler</title>
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="Created with Gigler - AI that lives in your texts">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #0f172a; max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1 { font-size: 2rem; margin-bottom: 1rem; }
    .content { margin-top: 1.5rem; white-space: pre-line; }
    .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 0.875rem; }
    .footer a { color: #4f46e5; text-decoration: none; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="content">${content}</div>
  <div class="footer">Created with <a href="${SITE_URL}">Gigler</a></div>
</body>
</html>`;
}

interface MediaRecord {
  gigId: string;
  mediaId: string;
  s3Key: string;
  type: string;
  uploadedBy: string;
  caption?: string;
  createdAt?: string;
}

async function getGigMedia(gigId: string): Promise<MediaRecord[]> {
  if (!MEDIA_TABLE_NAME) return [];
  const result = await ddb.send(
    new QueryCommand({
      TableName: MEDIA_TABLE_NAME,
      KeyConditionExpression: "gigId = :gid",
      ExpressionAttributeValues: { ":gid": gigId },
    })
  );
  return ((result.Items || []) as MediaRecord[])
    .filter((m) => m.type === "photo")
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
}

function mediaUrl(s3Key: string): string {
  if (CLOUDFRONT_DOMAIN) return `https://${CLOUDFRONT_DOMAIN}/${s3Key}`;
  if (S3_BUCKET_NAME) return `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;
  return "";
}

function generateGalleryHtml(title: string, images: MediaRecord[], description: string): string {
  const imageCards = images.map((img, i) => {
    const url = mediaUrl(img.s3Key);
    const caption = img.caption || `Photo ${i + 1}`;
    const uploader = img.uploadedBy === "gigler" ? "AI Generated" : "";
    return `
      <div class="card">
        <img src="${url}" alt="${caption}" loading="lazy" onclick="openLightbox(${i})">
        <div class="meta">
          <span class="caption">${caption}</span>
          ${uploader ? `<span class="badge">${uploader}</span>` : ""}
        </div>
      </div>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Gigler</title>
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description || "Photo gallery created with Gigler"}">
  <meta property="og:image" content="${images[0] ? mediaUrl(images[0].s3Key) : ""}">
  <style>
    :root { --bg: #0f0f0f; --card: #1a1a1a; --text: #e4e4e7; --muted: #71717a; --accent: #6d28d9; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'SF Pro Display', system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
    .hero { padding: 3rem 1.5rem 2rem; max-width: 1200px; margin: 0 auto; }
    .hero h1 { font-size: 2.5rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
    .hero p { color: var(--muted); font-size: 1rem; }
    .hero .count { color: var(--accent); font-weight: 600; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; padding: 0 1.5rem 3rem; max-width: 1200px; margin: 0 auto; }
    .card { background: var(--card); border-radius: 12px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }
    .card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.4); }
    .card img { width: 100%; aspect-ratio: 4/3; object-fit: cover; cursor: pointer; }
    .meta { padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; }
    .caption { font-size: 0.85rem; color: var(--muted); }
    .badge { font-size: 0.7rem; background: var(--accent); color: white; padding: 2px 8px; border-radius: 999px; }
    .footer { text-align: center; padding: 2rem; color: var(--muted); font-size: 0.8rem; border-top: 1px solid #27272a; }
    .footer a { color: var(--accent); text-decoration: none; }
    .lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 1000; align-items: center; justify-content: center; }
    .lightbox.open { display: flex; }
    .lightbox img { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 8px; }
    .lightbox .close { position: absolute; top: 1rem; right: 1.5rem; font-size: 2rem; color: white; cursor: pointer; background: none; border: none; }
    .lightbox .nav { position: absolute; top: 50%; transform: translateY(-50%); font-size: 2rem; color: white; cursor: pointer; background: rgba(255,255,255,0.1); border: none; border-radius: 50%; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; }
    .lightbox .prev { left: 1rem; }
    .lightbox .next { right: 1rem; }
    .empty { text-align: center; padding: 4rem 2rem; color: var(--muted); }
    .empty span { font-size: 3rem; display: block; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>${title}</h1>
    <p>${description || ""} ${images.length > 0 ? `<span class="count">${images.length} photo${images.length !== 1 ? "s" : ""}</span>` : ""}</p>
  </div>

  ${images.length > 0 ? `<div class="grid">${imageCards}</div>` : `
  <div class="empty">
    <span>📷</span>
    <p>No photos yet. Send photos via text to add them to this gallery!</p>
  </div>`}

  <div id="lightbox" class="lightbox">
    <button class="close" onclick="closeLightbox()">&times;</button>
    <button class="nav prev" onclick="prevImage()">&#8249;</button>
    <img id="lb-img" src="" alt="">
    <button class="nav next" onclick="nextImage()">&#8250;</button>
  </div>

  <div class="footer">Created with <a href="${SITE_URL}">Gigler</a></div>

  <script>
    const images = ${JSON.stringify(images.map((img) => mediaUrl(img.s3Key)))};
    let currentIdx = 0;
    function openLightbox(idx) {
      currentIdx = idx;
      document.getElementById('lb-img').src = images[idx];
      document.getElementById('lightbox').classList.add('open');
    }
    function closeLightbox() { document.getElementById('lightbox').classList.remove('open'); }
    function nextImage() { currentIdx = (currentIdx + 1) % images.length; document.getElementById('lb-img').src = images[currentIdx]; }
    function prevImage() { currentIdx = (currentIdx - 1 + images.length) % images.length; document.getElementById('lb-img').src = images[currentIdx]; }
    document.addEventListener('keydown', (e) => {
      if (!document.getElementById('lightbox').classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    });
  </script>
</body>
</html>`;
}

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
  mediaId?: string;
}

async function getGigMetadata(gigId: string): Promise<Record<string, unknown>> {
  if (!GIG_TABLE_NAME) return {};
  const result = await ddb.send(new GetCommand({ TableName: GIG_TABLE_NAME, Key: { id: gigId } }));
  if (!result.Item?.metadata) return {};
  try { return JSON.parse(result.Item.metadata as string); } catch { return {}; }
}

function generateBillsDashboardHtml(
  title: string,
  bills: Record<string, BillEntry[]>,
  monthlyTotals: Record<string, number>,
  billConfig: Record<string, { dueDay?: number }>
): string {
  const months = Object.keys(bills).sort().reverse();
  const currentMonth = months[0] || new Date().toISOString().substring(0, 7);
  const currentBills = bills[currentMonth] || [];
  const now = new Date();

  const statusBadge = (status: string, dueDate?: string): string => {
    if (status === "paid") return '<span class="badge paid">Paid</span>';
    if (status === "submitted") {
      if (dueDate && new Date(dueDate) < now) return '<span class="badge overdue">Overdue</span>';
      return '<span class="badge submitted">Submitted</span>';
    }
    if (dueDate && new Date(dueDate) < now) return '<span class="badge overdue">Overdue</span>';
    return '<span class="badge pending">Pending</span>';
  };

  const formatCurrency = (n?: number): string => n !== undefined ? `$${n.toFixed(2)}` : "—";
  const formatDate = (d?: string): string => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return d; }
  };
  const monthLabel = (key: string): string => {
    try {
      const [y, m] = key.split("-");
      return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } catch { return key; }
  };

  const billRows = (entries: BillEntry[]): string => entries.map((b) => `
    <tr>
      <td class="bill-type">${b.billType}</td>
      <td>${b.vendor || "—"}</td>
      <td class="amount">${formatCurrency(b.amount)}</td>
      <td>${formatDate(b.dueDate)}</td>
      <td>${statusBadge(b.status, b.dueDate)}</td>
    </tr>`).join("");

  const prevMonthSections = months.slice(1).map((month) => {
    const entries = bills[month] || [];
    const total = monthlyTotals[month] || 0;
    const paidCount = entries.filter((b) => b.status === "paid").length;
    return `
    <details class="month-section">
      <summary>
        <span class="month-name">${monthLabel(month)}</span>
        <span class="month-stats">${paidCount}/${entries.length} paid &middot; ${formatCurrency(total)}</span>
      </summary>
      <table>
        <thead><tr><th>Bill</th><th>Vendor</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead>
        <tbody>${billRows(entries)}</tbody>
        <tfoot><tr><td colspan="2">Total</td><td class="amount">${formatCurrency(total)}</td><td></td><td></td></tr></tfoot>
      </table>
    </details>`;
  }).join("");

  const comparisonBars = months.slice(0, 6).reverse().map((month) => {
    const total = monthlyTotals[month] || 0;
    const maxTotal = Math.max(...Object.values(monthlyTotals), 1);
    const pct = Math.round((total / maxTotal) * 100);
    const [, m] = month.split("-");
    const shortMonth = new Date(2026, parseInt(m) - 1).toLocaleDateString("en-US", { month: "short" });
    return `
    <div class="bar-group">
      <div class="bar-label">${shortMonth}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="bar-value">${formatCurrency(total)}</div>
    </div>`;
  }).join("");

  const currentTotal = monthlyTotals[currentMonth] || 0;
  const paidCount = currentBills.filter((b) => b.status === "paid").length;
  const submittedCount = currentBills.filter((b) => b.status === "submitted").length;
  const pendingCount = currentBills.length - paidCount - submittedCount;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Gigler</title>
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="Household bills dashboard powered by Gigler">
  <style>
    :root { --bg: #0f0f0f; --surface: #1a1a1a; --border: #27272a; --text: #e4e4e7; --muted: #71717a; --green: #22c55e; --yellow: #eab308; --red: #ef4444; --accent: #6d28d9; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'SF Pro Display', system-ui, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
    .container { max-width: 900px; margin: 0 auto; padding: 2rem 1.5rem; }
    .header { margin-bottom: 2rem; }
    .header h1 { font-size: 2rem; font-weight: 700; letter-spacing: -0.02em; }
    .header .subtitle { color: var(--muted); margin-top: 0.25rem; }
    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: var(--surface); border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border); }
    .stat-card .label { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-card .value { font-size: 1.75rem; font-weight: 700; margin-top: 0.25rem; }
    .stat-card .value.green { color: var(--green); }
    .stat-card .value.yellow { color: var(--yellow); }
    .stat-card .value.red { color: var(--red); }
    table { width: 100%; border-collapse: collapse; background: var(--surface); border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }
    th { text-align: left; padding: 0.75rem 1rem; font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); }
    td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
    tfoot td { font-weight: 700; border-top: 2px solid var(--border); border-bottom: none; }
    .bill-type { font-weight: 600; text-transform: capitalize; }
    .amount { font-variant-numeric: tabular-nums; font-weight: 600; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
    .badge.paid { background: rgba(34,197,94,0.15); color: var(--green); }
    .badge.submitted { background: rgba(234,179,8,0.15); color: var(--yellow); }
    .badge.pending { background: rgba(113,113,122,0.15); color: var(--muted); }
    .badge.overdue { background: rgba(239,68,68,0.15); color: var(--red); }
    .section-title { font-size: 1.1rem; font-weight: 600; margin: 2rem 0 1rem; }
    .month-section { background: var(--surface); border-radius: 12px; border: 1px solid var(--border); margin-bottom: 0.75rem; }
    .month-section summary { padding: 1rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; list-style: none; }
    .month-section summary::-webkit-details-marker { display: none; }
    .month-name { font-weight: 600; }
    .month-stats { color: var(--muted); font-size: 0.85rem; }
    .month-section table { border: none; border-radius: 0; }
    .comparison { background: var(--surface); border-radius: 12px; border: 1px solid var(--border); padding: 1.25rem; margin-bottom: 2rem; }
    .bar-group { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
    .bar-label { width: 40px; font-size: 0.8rem; color: var(--muted); text-align: right; }
    .bar-track { flex: 1; height: 24px; background: var(--border); border-radius: 6px; overflow: hidden; }
    .bar-fill { height: 100%; background: var(--accent); border-radius: 6px; transition: width 0.5s; }
    .bar-value { width: 70px; font-size: 0.8rem; font-weight: 600; font-variant-numeric: tabular-nums; }
    .footer { text-align: center; padding: 2rem 0; color: var(--muted); font-size: 0.8rem; border-top: 1px solid var(--border); margin-top: 2rem; }
    .footer a { color: var(--accent); text-decoration: none; }
    @media (max-width: 600px) {
      .container { padding: 0.75rem; }
      .header h1 { font-size: 1.5rem; }
      .stats-row { grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
      .stat-card { padding: 0.75rem; }
      .stat-card .value { font-size: 1.4rem; }
      th, td { padding: 0.5rem 0.4rem; font-size: 0.8rem; }
      th:nth-child(2), td:nth-child(2),
      th:nth-child(4), td:nth-child(4) { display: none; }
      tfoot td[colspan="2"] { display: table-cell; }
      .bar-value { width: 55px; font-size: 0.75rem; }
      .comparison { padding: 0.75rem; }
      img { max-width: 48px; max-height: 48px; border-radius: 4px; object-fit: cover; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      <div class="subtitle">${monthLabel(currentMonth)}</div>
    </div>

    <div class="stats-row">
      <div class="stat-card"><div class="label">Total</div><div class="value">${formatCurrency(currentTotal)}</div></div>
      <div class="stat-card"><div class="label">Paid</div><div class="value green">${paidCount}</div></div>
      <div class="stat-card"><div class="label">Submitted</div><div class="value yellow">${submittedCount}</div></div>
      <div class="stat-card"><div class="label">Pending</div><div class="value${pendingCount > 0 ? " red" : ""}">${pendingCount}</div></div>
    </div>

    <div class="section-title">This Month</div>
    <table>
      <thead><tr><th>Bill</th><th>Vendor</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead>
      <tbody>${billRows(currentBills)}</tbody>
      <tfoot><tr><td colspan="2">Total</td><td class="amount">${formatCurrency(currentTotal)}</td><td></td><td></td></tr></tfoot>
    </table>

    ${months.length > 1 ? `
    <div class="section-title">Month-over-Month</div>
    <div class="comparison">${comparisonBars}</div>

    <div class="section-title">Previous Months</div>
    ${prevMonthSections}
    ` : ""}

    <div class="footer">Powered by <a href="${SITE_URL}">Gigler</a></div>
  </div>
</body>
</html>`;
}

export const handler: Handler = async (event: DeliverableEvent, context) => {
  const trace = event._trace || { traceId: generateTraceId(), requestId: context.awsRequestId, source: "unknown" };
  const log = createLogger({ ...trace, source: "gigler-deliverable-generator", gigId: event.gigId, userId: event.userId });
  log.info("Creating deliverable", { type: event.type, title: event.title });

  const shortCode = await getUniqueShortCode();
  const deliverableId = `del_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  let s3Key = "";
  let publicUrl = "";

  switch (event.type) {
    case "pdf": {
      const pdfBuffer = await generatePdfContent(event.title, event.content);
      s3Key = `deliverables/${event.gigId}/${deliverableId}.pdf`;
      publicUrl = await uploadToS3(s3Key, pdfBuffer, "application/pdf");
      break;
    }
    case "website":
    case "menu": {
      const html = generateHtmlPage(event.title, event.content);
      s3Key = `deliverables/${event.gigId}/${deliverableId}/index.html`;
      publicUrl = await uploadToS3(s3Key, html, "text/html");
      break;
    }
    case "collage": {
      const media = await getGigMedia(event.gigId);
      log.info("Gallery media fetched", { count: media.length });
      const galleryHtml = generateGalleryHtml(event.title, media, event.content);
      s3Key = `deliverables/${event.gigId}/${deliverableId}/index.html`;
      publicUrl = await uploadToS3(s3Key, galleryHtml, "text/html");
      break;
    }
    case "code_project": {
      s3Key = `deliverables/${event.gigId}/${deliverableId}/readme.html`;
      const html = generateHtmlPage(event.title, event.content);
      publicUrl = await uploadToS3(s3Key, html, "text/html");
      break;
    }
    case "bills_dashboard": {
      const metadata = await getGigMetadata(event.gigId);
      const bills = (metadata.bills as Record<string, BillEntry[]>) || {};
      const monthlyTotals = (metadata.monthlyTotals as Record<string, number>) || {};
      const billConfig = (metadata.billConfig as Record<string, { dueDay?: number }>) || {};
      log.info("Bills dashboard data", { months: Object.keys(bills).length, currentMonthBills: (bills[Object.keys(bills).sort().reverse()[0] || ""] || []).length });
      const dashboardHtml = generateBillsDashboardHtml(event.title, bills, monthlyTotals, billConfig);
      s3Key = `deliverables/${event.gigId}/${deliverableId}/index.html`;
      publicUrl = await uploadToS3(s3Key, dashboardHtml, "text/html");
      break;
    }
  }

  const giglerUrl = `${SITE_URL}/${shortCode}`;

  await ddb.send(
    new PutCommand({
      TableName: DELIVERABLE_TABLE_NAME,
      Item: {
        gigId: event.gigId,
        deliverableId,
        type: event.type,
        title: event.title,
        s3Key,
        publicUrl: publicUrl || giglerUrl,
        shortCode,
        createdAt: now,
      },
    })
  );

  log.info("Deliverable created", { deliverableId, shortCode, url: giglerUrl, type: event.type, s3Key });
  return {
    statusCode: 200,
    body: JSON.stringify({
      deliverableId,
      shortCode,
      url: giglerUrl,
      s3Key,
    }),
  };
};
