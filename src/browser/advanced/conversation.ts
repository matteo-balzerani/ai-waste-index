// Local editing metadata only. These types are deliberately separate from API results.
export type MessageRole = "unknown" | "user" | "assistant";

export interface TechnicalDetails {
  model: string;
  reasoning: string;
  inputTokens: string;
  outputTokens: string;
}

export interface ConversationMessage extends TechnicalDetails {
  id: number;
  role: MessageRole;
  content: string;
}

export const emptyDetails = (): TechnicalDetails => ({
  model: "", reasoning: "", inputTokens: "", outputTokens: "",
});

// Browser resource limits, unrelated to estimator applicability.
export const prototypeTextLimit = 50_000;
export const prototypeMessageLimit = 200;

export function validTokenCount(value: string): boolean {
  return value === "" || /^\d{1,30}$/.test(value);
}

export function validDetails(details: TechnicalDetails): boolean {
  return details.model.length <= 200 && details.reasoning.length <= 200 &&
    validTokenCount(details.inputTokens) && validTokenCount(details.outputTokens);
}

/** Recognize explicit markers only. Unlabelled material is retained for manual review. */
export function parseConversation(text: string): Array<Pick<ConversationMessage, "role" | "content">> {
  if (!text.trim()) return [];
  const messages: Array<Pick<ConversationMessage, "role" | "content">> = [];
  let current: Pick<ConversationMessage, "role" | "content"> | undefined;
  let fence: string | null = null;
  for (const line of text.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
    const marker = !fence && /^(User|Utente|Assistant|Assistente):[ \t]?(.*)$/i.exec(line.replace(/\r?\n$/, ""));
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(marker ? marker[2]! : line);
    if (marker) {
      if (current) messages.push(current);
      current = {
        role: /^(user|utente)$/i.test(marker[1]!) ? "user" : "assistant",
        content: marker[2] + (line.endsWith("\r\n") ? "\r\n" : line.endsWith("\n") ? "\n" : ""),
      };
    } else {
      current ??= { role: "unknown", content: "" };
      current.content += line;
    }
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1]!;
      else if (fenceMatch[1]![0] === fence[0] && fenceMatch[1]!.length >= fence.length) fence = null;
    }
  }
  if (current) messages.push(current);
  return messages;
}
