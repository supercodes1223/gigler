import { describe, expect, it, vi } from "vitest";
import {
  downloadConversationMedia,
  downloadTwilioMedia,
  analyzeImageWithGemini,
  type VisionDeps,
} from "../vision";

function makeDeps(overrides: Partial<VisionDeps> = {}): VisionDeps {
  return {
    fetch: vi.fn(),
    accountSid: "AC_test",
    authToken: "token_test",
    conversationsServiceSid: "IS_test",
    geminiApiKey: "key_test",
    geminiModel: "gemini-test",
    ...overrides,
  };
}

function mockFetchResponse(body: ArrayBuffer | object, status = 200, contentType = "image/jpeg"): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: { get: (key: string) => key === "content-type" ? contentType : null },
    arrayBuffer: () => Promise.resolve(body instanceof ArrayBuffer ? body : new ArrayBuffer(0)),
    json: () => Promise.resolve(body),
  });
}

describe("downloadConversationMedia", () => {
  it("returns base64 and mimeType on success", async () => {
    const imgBuffer = new TextEncoder().encode("fakepng").buffer;
    const deps = makeDeps({ fetch: mockFetchResponse(imgBuffer, 200, "image/png") });

    const result = await downloadConversationMedia("ME_abc123", deps);
    expect(result).not.toBeNull();
    expect(result!.mimeType).toBe("image/png");
    expect(result!.base64.length).toBeGreaterThan(0);

    const calledUrl = (deps.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(calledUrl).toContain("/Media/ME_abc123/Content");
    expect(calledUrl).toContain("IS_test");
  });

  it("returns null when accountSid is empty", async () => {
    const deps = makeDeps({ accountSid: "" });
    const result = await downloadConversationMedia("ME_abc", deps);
    expect(result).toBeNull();
  });

  it("returns null when authToken is empty", async () => {
    const deps = makeDeps({ authToken: "" });
    const result = await downloadConversationMedia("ME_abc", deps);
    expect(result).toBeNull();
  });

  it("returns null when conversationsServiceSid is empty", async () => {
    const deps = makeDeps({ conversationsServiceSid: "" });
    const result = await downloadConversationMedia("ME_abc", deps);
    expect(result).toBeNull();
  });

  it("returns null on non-ok response", async () => {
    const deps = makeDeps({ fetch: mockFetchResponse(new ArrayBuffer(0), 404) });
    const result = await downloadConversationMedia("ME_abc", deps);
    expect(result).toBeNull();
  });

  it("returns null when content-type is application/json", async () => {
    const deps = makeDeps({ fetch: mockFetchResponse(new ArrayBuffer(0), 200, "application/json") });
    const result = await downloadConversationMedia("ME_abc", deps);
    expect(result).toBeNull();
  });

  it("returns null when content-type is text/html", async () => {
    const deps = makeDeps({ fetch: mockFetchResponse(new ArrayBuffer(0), 200, "text/html") });
    const result = await downloadConversationMedia("ME_abc", deps);
    expect(result).toBeNull();
  });

  it("returns null on fetch error", async () => {
    const deps = makeDeps({ fetch: vi.fn().mockRejectedValue(new Error("network")) });
    const result = await downloadConversationMedia("ME_abc", deps);
    expect(result).toBeNull();
  });

  it("sends correct auth header", async () => {
    const imgBuffer = new TextEncoder().encode("data").buffer;
    const deps = makeDeps({ fetch: mockFetchResponse(imgBuffer), accountSid: "AC123", authToken: "tok456" });
    await downloadConversationMedia("ME_abc", deps);

    const calledOpts = (deps.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const decoded = Buffer.from(calledOpts.headers.Authorization.replace("Basic ", ""), "base64").toString();
    expect(decoded).toBe("AC123:tok456");
  });
});

describe("downloadTwilioMedia", () => {
  it("returns base64 and mimeType on success", async () => {
    const imgBuffer = new TextEncoder().encode("fakeimg").buffer;
    const deps = makeDeps({ fetch: mockFetchResponse(imgBuffer, 200, "image/jpeg") });

    const result = await downloadTwilioMedia("https://api.twilio.com/media/123", deps);
    expect(result).not.toBeNull();
    expect(result!.mimeType).toBe("image/jpeg");
    expect(result!.base64.length).toBeGreaterThan(0);
  });

  it("returns null when accountSid is empty", async () => {
    const result = await downloadTwilioMedia("url", makeDeps({ accountSid: "" }));
    expect(result).toBeNull();
  });

  it("returns null when authToken is empty", async () => {
    const result = await downloadTwilioMedia("url", makeDeps({ authToken: "" }));
    expect(result).toBeNull();
  });

  it("returns null on non-ok response", async () => {
    const deps = makeDeps({ fetch: mockFetchResponse(new ArrayBuffer(0), 500) });
    const result = await downloadTwilioMedia("url", deps);
    expect(result).toBeNull();
  });

  it("returns null on fetch error", async () => {
    const deps = makeDeps({ fetch: vi.fn().mockRejectedValue(new Error("timeout")) });
    const result = await downloadTwilioMedia("url", deps);
    expect(result).toBeNull();
  });

  it("defaults mimeType to image/jpeg when header missing", async () => {
    const imgBuffer = new TextEncoder().encode("data").buffer;
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      headers: { get: () => null },
      arrayBuffer: () => Promise.resolve(imgBuffer),
    });
    const result = await downloadTwilioMedia("url", makeDeps({ fetch: fetchFn }));
    expect(result?.mimeType).toBe("image/jpeg");
  });
});

describe("analyzeImageWithGemini", () => {
  const media = { base64: "dGVzdA==", mimeType: "image/jpeg" };
  const gigContext = { type: "household", title: "Bills Tracker" };

  function mockGeminiResponse(text: string) {
    return vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text }] } }],
      }),
    });
  }

  it("returns parsed ImageAnalysisResult on valid JSON response", async () => {
    const validJson = JSON.stringify({
      imageType: "bill",
      extractedInfo: { hasAmounts: true, hasDates: true, totalAmount: "$142.50", description: "Power bill" },
      suggestedAction: "Log power bill",
    });
    const deps = makeDeps({ fetch: mockGeminiResponse(validJson) });
    const result = await analyzeImageWithGemini(media, gigContext, deps);
    expect(result).not.toBeNull();
    expect(result!.imageType).toBe("bill");
    expect(result!.extractedInfo.totalAmount).toBe("$142.50");
  });

  it("strips ```json fences from response", async () => {
    const validJson = JSON.stringify({
      imageType: "photo",
      extractedInfo: { hasAmounts: false, hasDates: false, description: "A photo" },
    });
    const deps = makeDeps({ fetch: mockGeminiResponse("```json\n" + validJson + "\n```") });
    const result = await analyzeImageWithGemini(media, gigContext, deps);
    expect(result).not.toBeNull();
    expect(result!.imageType).toBe("photo");
  });

  it("returns null when geminiApiKey is empty", async () => {
    const result = await analyzeImageWithGemini(media, gigContext, makeDeps({ geminiApiKey: "" }));
    expect(result).toBeNull();
  });

  it("returns null when response has no candidates", async () => {
    const deps = makeDeps({
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ candidates: [] }),
      }),
    });
    const result = await analyzeImageWithGemini(media, gigContext, deps);
    expect(result).toBeNull();
  });

  it("returns null when response text has no JSON", async () => {
    const deps = makeDeps({ fetch: mockGeminiResponse("This is just plain text with no JSON.") });
    const result = await analyzeImageWithGemini(media, gigContext, deps);
    expect(result).toBeNull();
  });

  it("repairs truncated JSON by closing braces", async () => {
    const truncated = '{"imageType": "bill", "extractedInfo": {"hasAmounts": true, "hasDates": false, "description": "test"}}  extra trailing junk that breaks first parse but the brace-matched portion is valid';
    const deps = makeDeps({ fetch: mockGeminiResponse(truncated) });
    const result = await analyzeImageWithGemini(media, gigContext, deps);
    expect(result).not.toBeNull();
    expect(result!.imageType).toBe("bill");
  });

  it("returns null on fetch error", async () => {
    const deps = makeDeps({ fetch: vi.fn().mockRejectedValue(new Error("network")) });
    const result = await analyzeImageWithGemini(media, gigContext, deps);
    expect(result).toBeNull();
  });

  it("sends correct URL with model and API key", async () => {
    const validJson = JSON.stringify({
      imageType: "photo",
      extractedInfo: { hasAmounts: false, hasDates: false, description: "test" },
    });
    const deps = makeDeps({ fetch: mockGeminiResponse(validJson), geminiModel: "gemini-vision-pro", geminiApiKey: "mykey123" });
    await analyzeImageWithGemini(media, gigContext, deps);

    const calledUrl = (deps.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(calledUrl).toContain("gemini-vision-pro");
    expect(calledUrl).toContain("mykey123");
  });

  it("sends image as inline_data in request body", async () => {
    const validJson = JSON.stringify({
      imageType: "photo",
      extractedInfo: { hasAmounts: false, hasDates: false, description: "test" },
    });
    const deps = makeDeps({ fetch: mockGeminiResponse(validJson) });
    await analyzeImageWithGemini(media, gigContext, deps);

    const calledBody = JSON.parse((deps.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    const parts = calledBody.contents[0].parts;
    expect(parts).toHaveLength(2);
    expect(parts[1].inline_data.data).toBe("dGVzdA==");
    expect(parts[1].inline_data.mime_type).toBe("image/jpeg");
  });

  it("includes gig description in prompt when available", async () => {
    const validJson = JSON.stringify({
      imageType: "photo",
      extractedInfo: { hasAmounts: false, hasDates: false, description: "test" },
    });
    const deps = makeDeps({ fetch: mockGeminiResponse(validJson) });
    await analyzeImageWithGemini(media, { ...gigContext, description: "Monthly power tracking" }, deps);

    const calledBody = JSON.parse((deps.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    const textPart = calledBody.contents[0].parts[0].text;
    expect(textPart).toContain("Monthly power tracking");
  });
});
