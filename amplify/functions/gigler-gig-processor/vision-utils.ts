export interface ImageAnalysisResult {
  imageType: "bill" | "receipt" | "invoice" | "document" | "photo" | "screenshot" | "other";
  extractedInfo: {
    hasAmounts: boolean;
    hasDates: boolean;
    totalAmount?: string;
    lineItems?: string;
    dueDate?: string;
    fromEntity?: string;
    billType?: string;
    description: string;
  };
  suggestedAction?: string;
}

export interface DownloadedMedia {
  base64: string;
  mimeType: string;
}

export interface GigAction {
  type: "generate_image" | "create_deliverable" | "set_reminder" | "book_reservation" | "add_participant" | "create_github_repo" | "create_collage" | "update_bill_status";
  prompt?: string;
  deliverableType?: string;
  title?: string;
  content?: string;
  scheduledAt?: string;
  reminderMessage?: string;
  channel?: string;
  platform?: string;
  params?: Record<string, unknown>;
  name?: string;
  phone?: string;
  description?: string;
  files?: Array<{ path: string; content: string }>;
  recurrence?: string;
  recurrenceDay?: number;
  billType?: string;
  vendor?: string;
  amount?: number;
  dueDate?: string;
  billingPeriod?: string;
  billStatus?: string;
  paidBy?: string;
  mediaId?: string;
}

export function formatVisionResultForPrompt(result: ImageAnalysisResult): string {
  const info = result.extractedInfo;
  const parts: string[] = [`Image type: ${result.imageType}`];
  if (info.description) parts.push(`Description: ${info.description}`);
  if (info.fromEntity) parts.push(`From: ${info.fromEntity}`);
  if (info.billType) parts.push(`Bill type: ${info.billType}`);
  if (info.totalAmount) parts.push(`Amount: ${info.totalAmount}`);
  if (info.dueDate) parts.push(`Due: ${info.dueDate}`);
  if (info.lineItems) parts.push(`Items: ${info.lineItems}`);
  if (result.suggestedAction) parts.push(`Suggested action: ${result.suggestedAction}`);
  return parts.join(". ");
}

export function actionsFromVisionResult(
  visionResult: ImageAnalysisResult,
  gigType: string,
  existingActions: GigAction[]
): GigAction[] {
  const extra: GigAction[] = [];
  const hasBillAction = existingActions.some(a => a.type === "update_bill_status");
  if (hasBillAction) return extra;

  const isBillGig = gigType === "household" || gigType === "bills";
  const isBillImage = ["bill", "receipt", "invoice", "screenshot"].includes(visionResult.imageType);

  if (isBillGig && isBillImage && visionResult.extractedInfo.billType) {
    const info = visionResult.extractedInfo;
    const amount = info.totalAmount ? parseFloat(info.totalAmount.replace(/[^0-9.]/g, "")) : undefined;
    extra.push({
      type: "update_bill_status",
      billType: info.billType,
      vendor: info.fromEntity,
      amount: Number.isFinite(amount) ? amount : undefined,
      dueDate: info.dueDate,
      billStatus: "submitted",
    });
  }
  return extra;
}
