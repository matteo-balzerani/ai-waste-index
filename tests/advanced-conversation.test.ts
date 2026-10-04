import { describe, expect, it } from "vitest";
import { parseConversation, validTokenCount } from "@/browser/advanced/conversation";

describe("local conversation review", () => {
  it("recognizes only explicit bilingual line markers and preserves content", () => {
    expect(parseConversation("User: First\r\nmore\r\nAssistente: Answer\r\nUtente: Revision\nAssistant: Final")).toEqual([
      { role: "user", content: "First\r\nmore\r\n" },
      { role: "assistant", content: "Answer\r\n" },
      { role: "user", content: "Revision\n" },
      { role: "assistant", content: "Final" },
    ]);
  });
  it("keeps ambiguous and leading material unassigned, without guessing or dropping it", () => {
    expect(parseConversation("Unlabelled introduction\nAssistant: Reply")).toEqual([
      { role: "unknown", content: "Unlabelled introduction\n" }, { role: "assistant", content: "Reply" },
    ]);
    expect(parseConversation("Me: Question\nBot: Answer")).toEqual([
      { role: "unknown", content: "Me: Question\nBot: Answer" },
    ]);
  });
  it.each(["```", "~~~~"])("keeps markers inside %s code fences as content", fence => {
    const content = `${fence}\nUser: a code example\n${fence}\n`;
    expect(parseConversation(`Assistant: ${content}User: next`)).toEqual([
      { role: "assistant", content }, { role: "user", content: "next" },
    ]);
  });
  it("retains empty and repeated explicit roles for the user to review", () => {
    expect(parseConversation("Assistant:\nAssistant: next")).toEqual([
      { role: "assistant", content: "\n" }, { role: "assistant", content: "next" },
    ]);
    expect(parseConversation(" \n")).toEqual([]);
  });
  it.each(["", "0", "12", "0012", "9".repeat(30)])("accepts an absent or nonnegative count: %s", value => {
    expect(validTokenCount(value)).toBe(true);
  });
  it.each(["-1", "1.5", "1e3", "NaN", "Infinity", " ", "+1", "9".repeat(31)])("rejects invalid count: %s", value => {
    expect(validTokenCount(value)).toBe(false);
  });
});
