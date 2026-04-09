import { describe, expect, it } from "vitest";
import { parseFormBody, conversationsBase, conversationsAuthHeaders, maskPhone } from "../twilio-helpers";

describe("parseFormBody", () => {
  it("parses simple form-encoded body", () => {
    const result = parseFormBody("Body=Hello&From=%2B1234");
    expect(result).toEqual({ Body: "Hello", From: "+1234" });
  });

  it("decodes url-encoded values", () => {
    const result = parseFormBody("Body=Hello%20World&Name=John%20Doe");
    expect(result).toEqual({ Body: "Hello World", Name: "John Doe" });
  });

  it("handles empty body", () => {
    const result = parseFormBody("");
    expect(result).toEqual({});
  });

  it("handles single parameter", () => {
    const result = parseFormBody("key=value");
    expect(result).toEqual({ key: "value" });
  });

  it("handles values with special characters", () => {
    const result = parseFormBody("Body=Hey%21+What%27s+up%3F");
    expect(result.Body).toBeTruthy();
  });
});

describe("conversationsBase", () => {
  it("constructs the correct URL", () => {
    const url = conversationsBase("/Conversations", "IS123");
    expect(url).toBe("https://conversations.twilio.com/v1/Services/IS123/Conversations");
  });

  it("handles path with nested segments", () => {
    const url = conversationsBase("/Conversations/CH123/Messages", "IS456");
    expect(url).toBe("https://conversations.twilio.com/v1/Services/IS456/Conversations/CH123/Messages");
  });
});

describe("conversationsAuthHeaders", () => {
  it("returns Authorization and Content-Type headers", () => {
    const headers = conversationsAuthHeaders("AC123", "token123");
    expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(headers.Authorization).toMatch(/^Basic /);
  });

  it("encodes credentials correctly", () => {
    const headers = conversationsAuthHeaders("AC123", "token123");
    const decoded = Buffer.from(headers.Authorization.replace("Basic ", ""), "base64").toString();
    expect(decoded).toBe("AC123:token123");
  });
});

describe("maskPhone", () => {
  it("masks all but last 4 digits", () => {
    expect(maskPhone("+12025551234")).toBe("***1234");
  });

  it("returns undefined for undefined input", () => {
    expect(maskPhone(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(maskPhone("")).toBeUndefined();
  });

  it("handles short phone numbers (<=4 chars)", () => {
    expect(maskPhone("1234")).toBe("1234");
  });

  it("handles exactly 5 chars", () => {
    expect(maskPhone("12345")).toBe("***2345");
  });
});
