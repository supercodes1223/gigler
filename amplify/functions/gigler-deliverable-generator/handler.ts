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
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
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
  type: "pdf" | "website" | "menu" | "collage" | "code_project";
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
