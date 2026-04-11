/**
 * Extracted executeActions module with injectable dependencies.
 * This enables proper integration testing of the action execution pipeline.
 */

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

export interface TraceContext {
  traceId: string;
  requestId: string;
  source: string;
}

export interface ExistingDeliverable {
  shortCode: string;
  publicUrl: string;
  s3Key: string;
}

export interface ActionContext {
  gigId: string;
  userId: string;
  phone: string;
  conversationSid?: string;
  gigType?: string;
}

export interface BillStatusEntry {
  billType: string;
  vendor?: string;
  amount?: number;
  dueDate?: string;
  billingPeriod?: string;
  status: string;
  submittedBy?: string;
  paidBy?: string;
  mediaId?: string;
}

export interface ReminderParams {
  gigId: string;
  userId: string;
  scheduledAt: string;
  type: string;
  message: string;
  channel: string;
  recipients: string[];
  recurrence?: string;
  recurrenceDay?: number;
}

export interface ActionDeps {
  invokeLambdaAsync: (functionName: string, payload: Record<string, unknown>) => Promise<void>;
  invokeLambdaSync: (functionName: string, payload: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  sendSms: (to: string, message: string) => Promise<{ success: boolean; messageSid?: string; error?: string }>;
  sendConversationMessage: (conversationSid: string, body: string) => Promise<void>;
  getExistingDeliverable: (gigId: string, type: string) => Promise<ExistingDeliverable | null>;
  handleUpdateBillStatus: (gigId: string, entry: BillStatusEntry) => Promise<void>;
  handleAddParticipant: (gigId: string, userId: string, phone: string, name: string, participantPhone: string, trace: TraceContext) => Promise<void>;
  handleCreateGitHubRepo: (gigId: string, userId: string, phone: string, name: string, description: string, files: Array<{ path: string; content: string }>, trace: TraceContext) => Promise<void>;
  createReminder: (params: ReminderParams) => Promise<void>;
  mediaProcessorFunctionName: string;
  deliverableGeneratorFunctionName: string;
  thirdPartyActionsFunctionName: string;
}

export async function executeActions(
  actions: GigAction[],
  ctx: ActionContext,
  trace: TraceContext,
  deps: ActionDeps,
): Promise<{ deliverableLinkSent: boolean; smsSent: string[]; groupMessagesSent: string[] }> {
  const result = { deliverableLinkSent: false, smsSent: [] as string[], groupMessagesSent: [] as string[] };

  for (const action of actions) {
    switch (action.type) {
      case "generate_image":
        await deps.invokeLambdaAsync(deps.mediaProcessorFunctionName, {
          action: "generate_image",
          gigId: ctx.gigId, userId: ctx.userId,
          prompt: action.prompt || "", phone: ctx.phone,
          _trace: trace,
        });
        break;

      case "create_deliverable": {
        if (result.deliverableLinkSent) {
          console.log(`[executeActions] Skipping create_deliverable — link already sent this batch`);
          break;
        }
        const delType = action.deliverableType || "website";
        const existing = await deps.getExistingDeliverable(ctx.gigId, delType);
        if (existing) {
          const existingUrl = `https://gigler.ai/${existing.shortCode}`;
          console.log(`[executeActions] Reusing existing ${delType} deliverable for gig ${ctx.gigId}: ${existingUrl}`);
          const linkMsg = `Here's your tracking page: ${existingUrl}`;
          if (ctx.conversationSid) {
            await deps.sendConversationMessage(ctx.conversationSid, linkMsg);
            result.groupMessagesSent.push(linkMsg);
          } else if (ctx.phone) {
            await deps.sendSms(ctx.phone, linkMsg);
            result.smsSent.push(linkMsg);
          }
          result.deliverableLinkSent = true;
          break;
        }
        const delResult = await deps.invokeLambdaSync(deps.deliverableGeneratorFunctionName, {
          gigId: ctx.gigId, userId: ctx.userId,
          type: delType,
          title: action.title || "Untitled",
          content: action.content || "", phone: ctx.phone,
          _trace: trace,
        });
        if (delResult?.url) {
          const linkMsg = `Here's your tracking page: ${delResult.url}`;
          if (ctx.conversationSid) {
            await deps.sendConversationMessage(ctx.conversationSid, linkMsg);
            result.groupMessagesSent.push(linkMsg);
          } else if (ctx.phone) {
            await deps.sendSms(ctx.phone, linkMsg);
            result.smsSent.push(linkMsg);
          }
          result.deliverableLinkSent = true;
        }
        break;
      }

      case "set_reminder":
        if (action.scheduledAt) {
          const reminderParams: ReminderParams = {
            gigId: ctx.gigId, userId: ctx.userId,
            scheduledAt: action.scheduledAt, type: "reminder",
            message: action.reminderMessage || "Reminder from your gig",
            channel: action.channel || "sms",
            recipients: [ctx.phone],
            recurrence: action.recurrence,
            recurrenceDay: action.recurrenceDay,
          };
          await deps.createReminder(reminderParams);
        }
        break;

      case "update_bill_status":
        if (action.billType) {
          const billEntry: BillStatusEntry = {
            billType: action.billType,
            vendor: action.vendor,
            amount: action.amount,
            dueDate: action.dueDate,
            billingPeriod: action.billingPeriod,
            status: action.billStatus || "submitted",
            submittedBy: ctx.phone,
            paidBy: action.paidBy || ctx.phone,
            mediaId: action.mediaId,
          };
          await deps.handleUpdateBillStatus(ctx.gigId, billEntry);

          const isBillGig = ctx.gigType === "household" || ctx.gigType === "bills";
          if (isBillGig) {
            const existing = await deps.getExistingDeliverable(ctx.gigId, "bills_dashboard");
            if (existing) {
              const dashUrl = `https://gigler.ai/${existing.shortCode}`;
              console.log(`[executeActions] Auto-sending existing bills dashboard: ${dashUrl}`);
              const dashMsg = `Here's your tracking page: ${dashUrl}`;
              if (ctx.conversationSid) {
                await deps.sendConversationMessage(ctx.conversationSid, dashMsg);
                result.groupMessagesSent.push(dashMsg);
              } else if (ctx.phone) {
                await deps.sendSms(ctx.phone, dashMsg);
                result.smsSent.push(dashMsg);
              }
              result.deliverableLinkSent = true;
            } else {
              console.log(`[executeActions] Auto-creating bills_dashboard for gig ${ctx.gigId}`);
              const delResult = await deps.invokeLambdaSync(deps.deliverableGeneratorFunctionName, {
                gigId: ctx.gigId, userId: ctx.userId,
                type: "bills_dashboard",
                title: "Bills Dashboard",
                content: "", phone: ctx.phone,
                _trace: trace,
              });
              if (delResult?.url) {
                const dashMsg = `Here's your tracking page: ${delResult.url}`;
                if (ctx.conversationSid) {
                  await deps.sendConversationMessage(ctx.conversationSid, dashMsg);
                  result.groupMessagesSent.push(dashMsg);
                } else if (ctx.phone) {
                  await deps.sendSms(ctx.phone, dashMsg);
                  result.smsSent.push(dashMsg);
                }
                result.deliverableLinkSent = true;
              }
            }
          }
        }
        break;

      case "book_reservation":
        await deps.invokeLambdaAsync(deps.thirdPartyActionsFunctionName, {
          gigId: ctx.gigId, userId: ctx.userId,
          platform: action.platform || "opentable",
          actionType: "search", params: action.params || {},
          phone: ctx.phone, _trace: trace,
        });
        break;

      case "add_participant":
        if (action.phone && action.name && action.name !== "Participant") {
          await deps.handleAddParticipant(
            ctx.gigId, ctx.userId, ctx.phone,
            action.name, action.phone, trace
          );
        } else if (action.phone && (!action.name || action.name === "Participant")) {
          console.warn(`[executeActions] Participant name is placeholder — asking owner for real name`);
          await deps.sendSms(ctx.phone, `I have the number (${action.phone}) but I need a real first name before adding them to the group. What's their name?`);
          result.smsSent.push("name-prompt");
        }
        break;

      case "create_github_repo":
        if (action.name && action.files?.length) {
          await deps.handleCreateGitHubRepo(
            ctx.gigId, ctx.userId, ctx.phone,
            action.name, action.description || "",
            action.files, trace
          );
        }
        break;

      case "create_collage":
        await deps.invokeLambdaAsync(deps.deliverableGeneratorFunctionName, {
          gigId: ctx.gigId, userId: ctx.userId,
          type: "collage",
          title: action.title || "Photo Gallery",
          content: action.content || "",
          phone: ctx.phone, _trace: trace,
        });
        break;

      default:
        console.warn(`[executeActions] Unknown action type: ${(action as GigAction).type}`);
    }
  }

  return result;
}
