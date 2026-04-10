/**
 * Integration tests for executeActions — the orchestration layer.
 *
 * These tests verify the EXACT scenarios that were previously only caught
 * by manual testing:
 *   - Does update_bill_status for a household gig auto-create a deliverable?
 *   - Does create_deliverable reuse existing short codes?
 *   - Is the tracking link actually sent to the user/group?
 *   - Does a non-household gig skip auto-deliverable creation?
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  executeActions,
  type GigAction,
  type ActionContext,
  type TraceContext,
  type ActionDeps,
} from "../execute-actions";

function makeDeps(overrides: Partial<ActionDeps> = {}): ActionDeps {
  return {
    invokeLambdaAsync: vi.fn().mockResolvedValue(undefined),
    invokeLambdaSync: vi.fn().mockResolvedValue(null),
    sendSms: vi.fn().mockResolvedValue({ success: true, messageSid: "SM123" }),
    sendConversationMessage: vi.fn().mockResolvedValue(undefined),
    getExistingDeliverable: vi.fn().mockResolvedValue(null),
    handleUpdateBillStatus: vi.fn().mockResolvedValue(undefined),
    handleAddParticipant: vi.fn().mockResolvedValue(undefined),
    handleCreateGitHubRepo: vi.fn().mockResolvedValue(undefined),
    createReminder: vi.fn().mockResolvedValue(undefined),
    mediaProcessorFunctionName: "media-processor",
    deliverableGeneratorFunctionName: "deliverable-generator",
    thirdPartyActionsFunctionName: "third-party",
    ...overrides,
  };
}

const TRACE: TraceContext = { traceId: "test-trace", requestId: "test-req", source: "test" };

const DIRECT_CTX: ActionContext = {
  gigId: "gig_123", userId: "usr_456", phone: "+14155551234",
};

const GROUP_CTX: ActionContext = {
  gigId: "gig_123", userId: "usr_456", phone: "+14155551234",
  conversationSid: "CH_group_abc",
};

// ═══════════════════════════════════════════════════════════════════════════════
// CRITICAL PATH: Bill image → update_bill_status → auto-create deliverable
// This is the EXACT scenario that was only caught by manual testing
// ═══════════════════════════════════════════════════════════════════════════════

describe("executeActions: bill → deliverable pipeline (household gig)", () => {
  it("auto-creates bills_dashboard when update_bill_status runs on household gig with NO existing deliverable", async () => {
    const deps = makeDeps({
      invokeLambdaSync: vi.fn().mockResolvedValue({ url: "https://gigler.ai/abc123" }),
    });
    const ctx: ActionContext = { ...GROUP_CTX, gigType: "household" };
    const actions: GigAction[] = [{
      type: "update_bill_status",
      billType: "power", vendor: "Austin Energy",
      amount: 528.93, billStatus: "submitted",
    }];

    const result = await executeActions(actions, ctx, TRACE, deps);

    expect(deps.handleUpdateBillStatus).toHaveBeenCalledOnce();
    expect(deps.getExistingDeliverable).toHaveBeenCalledWith("gig_123", "bills_dashboard");
    expect(deps.invokeLambdaSync).toHaveBeenCalledWith("deliverable-generator", expect.objectContaining({
      gigId: "gig_123", type: "bills_dashboard", title: "Bills Dashboard",
    }));
    expect(deps.sendConversationMessage).toHaveBeenCalledWith("CH_group_abc", "Here's your tracking page: https://gigler.ai/abc123");
    expect(result.deliverableLinkSent).toBe(true);
    expect(result.groupMessagesSent).toContain("Here's your tracking page: https://gigler.ai/abc123");
  });

  it("sends existing dashboard link when deliverable already exists", async () => {
    const deps = makeDeps({
      getExistingDeliverable: vi.fn().mockResolvedValue({
        shortCode: "xyz789", publicUrl: "https://gigler.ai/xyz789", s3Key: "some/key",
      }),
    });
    const ctx: ActionContext = { ...GROUP_CTX, gigType: "household" };
    const actions: GigAction[] = [{
      type: "update_bill_status",
      billType: "water", vendor: "City Water", amount: 85.00, billStatus: "submitted",
    }];

    const result = await executeActions(actions, ctx, TRACE, deps);

    expect(deps.handleUpdateBillStatus).toHaveBeenCalledOnce();
    expect(deps.getExistingDeliverable).toHaveBeenCalledWith("gig_123", "bills_dashboard");
    expect(deps.invokeLambdaSync).not.toHaveBeenCalled();
    expect(deps.sendConversationMessage).toHaveBeenCalledWith("CH_group_abc", "Here's your tracking page: https://gigler.ai/xyz789");
    expect(result.deliverableLinkSent).toBe(true);
  });

  it("sends dashboard link via SMS when no group conversation (direct chat)", async () => {
    const deps = makeDeps({
      invokeLambdaSync: vi.fn().mockResolvedValue({ url: "https://gigler.ai/new456" }),
    });
    const ctx: ActionContext = { ...DIRECT_CTX, gigType: "household" };
    const actions: GigAction[] = [{
      type: "update_bill_status",
      billType: "electric", amount: 200, billStatus: "submitted",
    }];

    const result = await executeActions(actions, ctx, TRACE, deps);

    expect(deps.sendSms).toHaveBeenCalledWith("+14155551234", "Here's your tracking page: https://gigler.ai/new456");
    expect(deps.sendConversationMessage).not.toHaveBeenCalled();
    expect(result.deliverableLinkSent).toBe(true);
    expect(result.smsSent).toContain("Here's your tracking page: https://gigler.ai/new456");
  });

  it("does NOT auto-create deliverable for non-household gig types", async () => {
    const deps = makeDeps();
    const ctx: ActionContext = { ...GROUP_CTX, gigType: "planning" };
    const actions: GigAction[] = [{
      type: "update_bill_status",
      billType: "catering", amount: 1500, billStatus: "submitted",
    }];

    const result = await executeActions(actions, ctx, TRACE, deps);

    expect(deps.handleUpdateBillStatus).toHaveBeenCalledOnce();
    expect(deps.getExistingDeliverable).not.toHaveBeenCalled();
    expect(deps.invokeLambdaSync).not.toHaveBeenCalled();
    expect(result.deliverableLinkSent).toBe(false);
  });

  it("does NOT auto-create deliverable when gigType is undefined", async () => {
    const deps = makeDeps();
    const actions: GigAction[] = [{
      type: "update_bill_status",
      billType: "power", amount: 100, billStatus: "submitted",
    }];

    const result = await executeActions(actions, DIRECT_CTX, TRACE, deps);

    expect(deps.handleUpdateBillStatus).toHaveBeenCalledOnce();
    expect(deps.getExistingDeliverable).not.toHaveBeenCalled();
    expect(result.deliverableLinkSent).toBe(false);
  });

  it("handles deliverable generator returning null gracefully", async () => {
    const deps = makeDeps({
      invokeLambdaSync: vi.fn().mockResolvedValue(null),
    });
    const ctx: ActionContext = { ...GROUP_CTX, gigType: "household" };
    const actions: GigAction[] = [{
      type: "update_bill_status",
      billType: "gas", amount: 75, billStatus: "submitted",
    }];

    const result = await executeActions(actions, ctx, TRACE, deps);

    expect(deps.handleUpdateBillStatus).toHaveBeenCalledOnce();
    expect(deps.invokeLambdaSync).toHaveBeenCalled();
    expect(deps.sendConversationMessage).not.toHaveBeenCalled();
    expect(result.deliverableLinkSent).toBe(false);
  });

  it("works with 'bills' gig type too (not just 'household')", async () => {
    const deps = makeDeps({
      invokeLambdaSync: vi.fn().mockResolvedValue({ url: "https://gigler.ai/bills1" }),
    });
    const ctx: ActionContext = { ...DIRECT_CTX, gigType: "bills" };
    const actions: GigAction[] = [{
      type: "update_bill_status",
      billType: "internet", amount: 60, billStatus: "submitted",
    }];

    const result = await executeActions(actions, ctx, TRACE, deps);

    expect(deps.invokeLambdaSync).toHaveBeenCalledWith("deliverable-generator", expect.objectContaining({
      type: "bills_dashboard",
    }));
    expect(result.deliverableLinkSent).toBe(true);
  });

  it("skips bill status update when billType is missing", async () => {
    const deps = makeDeps();
    const ctx: ActionContext = { ...GROUP_CTX, gigType: "household" };
    const actions: GigAction[] = [{
      type: "update_bill_status",
      billStatus: "submitted",
    }];

    await executeActions(actions, ctx, TRACE, deps);

    expect(deps.handleUpdateBillStatus).not.toHaveBeenCalled();
    expect(deps.getExistingDeliverable).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// create_deliverable: duplicate prevention & link reuse
// Previously: created new short codes every time (duplicate tracking pages)
// ═══════════════════════════════════════════════════════════════════════════════

describe("executeActions: create_deliverable dedup & reuse", () => {
  it("reuses existing deliverable short code instead of creating new one", async () => {
    const deps = makeDeps({
      getExistingDeliverable: vi.fn().mockResolvedValue({
        shortCode: "exist1", publicUrl: "https://gigler.ai/exist1", s3Key: "key",
      }),
    });
    const actions: GigAction[] = [{
      type: "create_deliverable", deliverableType: "bills_dashboard",
      title: "Dashboard", content: "",
    }];

    const result = await executeActions(actions, GROUP_CTX, TRACE, deps);

    expect(deps.invokeLambdaSync).not.toHaveBeenCalled();
    expect(deps.sendConversationMessage).toHaveBeenCalledWith("CH_group_abc", "Here's your tracking page: https://gigler.ai/exist1");
    expect(result.deliverableLinkSent).toBe(true);
  });

  it("creates new deliverable when none exists", async () => {
    const deps = makeDeps({
      invokeLambdaSync: vi.fn().mockResolvedValue({ url: "https://gigler.ai/new1" }),
    });
    const actions: GigAction[] = [{
      type: "create_deliverable", deliverableType: "website",
      title: "My Site", content: "<h1>Hello</h1>",
    }];

    const result = await executeActions(actions, GROUP_CTX, TRACE, deps);

    expect(deps.invokeLambdaSync).toHaveBeenCalledWith("deliverable-generator", expect.objectContaining({
      type: "website", title: "My Site", content: "<h1>Hello</h1>",
    }));
    expect(deps.sendConversationMessage).toHaveBeenCalledWith("CH_group_abc", "Here's your tracking page: https://gigler.ai/new1");
    expect(result.deliverableLinkSent).toBe(true);
  });

  it("sends deliverable link via SMS when no group conversation", async () => {
    const deps = makeDeps({
      invokeLambdaSync: vi.fn().mockResolvedValue({ url: "https://gigler.ai/sms1" }),
    });
    const actions: GigAction[] = [{
      type: "create_deliverable", deliverableType: "pdf", title: "Report",
    }];

    const result = await executeActions(actions, DIRECT_CTX, TRACE, deps);

    expect(deps.sendSms).toHaveBeenCalledWith("+14155551234", "Here's your tracking page: https://gigler.ai/sms1");
    expect(result.deliverableLinkSent).toBe(true);
    expect(result.smsSent.length).toBe(1);
  });

  it("deliverableLinkSent is false when generator returns no URL", async () => {
    const deps = makeDeps({
      invokeLambdaSync: vi.fn().mockResolvedValue({}),
    });
    const actions: GigAction[] = [{
      type: "create_deliverable", deliverableType: "website", title: "Broken",
    }];

    const result = await executeActions(actions, GROUP_CTX, TRACE, deps);

    expect(result.deliverableLinkSent).toBe(false);
    expect(deps.sendConversationMessage).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// add_participant validation
// Previously: Gemini hallucinated add_participant with bad data
// ═══════════════════════════════════════════════════════════════════════════════

describe("executeActions: add_participant", () => {
  it("calls handleAddParticipant with valid name and phone", async () => {
    const deps = makeDeps();
    const actions: GigAction[] = [{
      type: "add_participant", name: "Sarah", phone: "+14155559999",
    }];

    await executeActions(actions, DIRECT_CTX, TRACE, deps);

    expect(deps.handleAddParticipant).toHaveBeenCalledWith(
      "gig_123", "usr_456", "+14155551234", "Sarah", "+14155559999", TRACE
    );
  });

  it("asks for real name when name is 'Participant' placeholder", async () => {
    const deps = makeDeps();
    const actions: GigAction[] = [{
      type: "add_participant", name: "Participant", phone: "+14155559999",
    }];

    const result = await executeActions(actions, DIRECT_CTX, TRACE, deps);

    expect(deps.handleAddParticipant).not.toHaveBeenCalled();
    expect(deps.sendSms).toHaveBeenCalledWith("+14155551234", expect.stringContaining("real first name"));
    expect(result.smsSent).toContain("name-prompt");
  });

  it("skips when phone is missing", async () => {
    const deps = makeDeps();
    const actions: GigAction[] = [{
      type: "add_participant", name: "Sarah",
    }];

    await executeActions(actions, DIRECT_CTX, TRACE, deps);

    expect(deps.handleAddParticipant).not.toHaveBeenCalled();
    expect(deps.sendSms).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// set_reminder
// ═══════════════════════════════════════════════════════════════════════════════

describe("executeActions: set_reminder", () => {
  it("creates reminder with all fields", async () => {
    const deps = makeDeps();
    const actions: GigAction[] = [{
      type: "set_reminder",
      scheduledAt: "2026-04-15T10:00:00Z",
      reminderMessage: "Pay the electric bill",
      channel: "sms",
      recurrence: "monthly",
      recurrenceDay: 15,
    }];

    await executeActions(actions, DIRECT_CTX, TRACE, deps);

    expect(deps.createReminder).toHaveBeenCalledWith(expect.objectContaining({
      gigId: "gig_123", userId: "usr_456",
      scheduledAt: "2026-04-15T10:00:00Z",
      message: "Pay the electric bill",
      channel: "sms",
      recurrence: "monthly",
      recurrenceDay: 15,
    }));
  });

  it("skips when scheduledAt is missing", async () => {
    const deps = makeDeps();
    const actions: GigAction[] = [{
      type: "set_reminder", reminderMessage: "no date",
    }];

    await executeActions(actions, DIRECT_CTX, TRACE, deps);

    expect(deps.createReminder).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Multiple actions in sequence
// ═══════════════════════════════════════════════════════════════════════════════

describe("executeActions: multiple actions in one call", () => {
  it("processes update_bill_status + create_deliverable together", async () => {
    const deps = makeDeps({
      invokeLambdaSync: vi.fn().mockResolvedValue({ url: "https://gigler.ai/multi1" }),
    });
    const ctx: ActionContext = { ...GROUP_CTX, gigType: "household" };
    const actions: GigAction[] = [
      { type: "update_bill_status", billType: "power", amount: 200, billStatus: "submitted" },
      { type: "create_deliverable", deliverableType: "bills_dashboard", title: "Dashboard" },
    ];

    const result = await executeActions(actions, ctx, TRACE, deps);

    expect(deps.handleUpdateBillStatus).toHaveBeenCalledOnce();
    expect(result.deliverableLinkSent).toBe(true);
    expect(result.groupMessagesSent.length).toBeGreaterThanOrEqual(1);
    expect(result.groupMessagesSent.some(m => m.includes("tracking page"))).toBe(true);
  });

  it("processes add_participant + set_reminder together", async () => {
    const deps = makeDeps();
    const actions: GigAction[] = [
      { type: "add_participant", name: "Billy", phone: "+14155558888" },
      { type: "set_reminder", scheduledAt: "2026-05-01T09:00:00Z", reminderMessage: "Check in" },
    ];

    await executeActions(actions, DIRECT_CTX, TRACE, deps);

    expect(deps.handleAddParticipant).toHaveBeenCalledOnce();
    expect(deps.createReminder).toHaveBeenCalledOnce();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Full end-to-end simulation: bill photo → vision → actions → deliverable
// This is the EXACT flow that kept breaking in manual tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("executeActions: full bill photo simulation", () => {
  it("simulates the complete flow: bill image analyzed → update_bill_status → dashboard created → link sent to group", async () => {
    const deps = makeDeps({
      invokeLambdaSync: vi.fn().mockResolvedValue({ url: "https://gigler.ai/dash1" }),
    });
    const ctx: ActionContext = {
      gigId: "gig_bill_test",
      userId: "usr_owner",
      phone: "+14083354712",
      conversationSid: "CH_group_bills",
      gigType: "household",
    };

    const actions: GigAction[] = [{
      type: "update_bill_status",
      billType: "power",
      vendor: "Austin Energy",
      amount: 528.93,
      dueDate: "2026-05-01",
      billingPeriod: "February 2026",
      billStatus: "submitted",
    }];

    const result = await executeActions(actions, ctx, TRACE, deps);

    expect(deps.handleUpdateBillStatus).toHaveBeenCalledWith("gig_bill_test", expect.objectContaining({
      billType: "power",
      vendor: "Austin Energy",
      amount: 528.93,
      status: "submitted",
    }));

    expect(deps.getExistingDeliverable).toHaveBeenCalledWith("gig_bill_test", "bills_dashboard");

    expect(deps.invokeLambdaSync).toHaveBeenCalledWith("deliverable-generator", expect.objectContaining({
      gigId: "gig_bill_test",
      type: "bills_dashboard",
      title: "Bills Dashboard",
    }));

    expect(result.deliverableLinkSent).toBe(true);

    expect(deps.sendConversationMessage).toHaveBeenCalledWith(
      "CH_group_bills",
      "Here's your tracking page: https://gigler.ai/dash1"
    );

    expect(result.groupMessagesSent).toHaveLength(1);
    expect(result.groupMessagesSent[0]).toContain("gigler.ai/dash1");
  });

  it("simulates second bill: dashboard already exists → reuses link", async () => {
    const deps = makeDeps({
      getExistingDeliverable: vi.fn().mockResolvedValue({
        shortCode: "dash1", publicUrl: "https://gigler.ai/dash1", s3Key: "dashboards/dash1.html",
      }),
    });
    const ctx: ActionContext = {
      gigId: "gig_bill_test",
      userId: "usr_owner",
      phone: "+14083354712",
      conversationSid: "CH_group_bills",
      gigType: "household",
    };

    const actions: GigAction[] = [{
      type: "update_bill_status",
      billType: "water",
      vendor: "City Water",
      amount: 85.00,
      billStatus: "submitted",
    }];

    const result = await executeActions(actions, ctx, TRACE, deps);

    expect(deps.invokeLambdaSync).not.toHaveBeenCalled();

    expect(deps.sendConversationMessage).toHaveBeenCalledWith(
      "CH_group_bills",
      "Here's your tracking page: https://gigler.ai/dash1"
    );
    expect(result.deliverableLinkSent).toBe(true);
  });
});
