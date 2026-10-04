import { useEffect, useState } from "react";
import { countTokensLocally } from "./client";
import { textInputError } from "./types";

export function useTokenCount(text: string, enabled: boolean) {
  const [attempt, setAttempt] = useState(0);
  const [completed, setCompleted] = useState<{ text: string; count?: number; attempt: number } | null>(null);
  const valid = textInputError(text) === null;
  const current = completed?.text === text && completed.attempt === attempt ? completed : null;
  useEffect(() => {
    if (!enabled || !valid) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void countTokensLocally(text, controller.signal).then(count => {
        if (!controller.signal.aborted) setCompleted({ text, count, attempt });
      }).catch(() => {
        if (!controller.signal.aborted) setCompleted({ text, attempt });
      });
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [text, enabled, valid, attempt]);
  return { count: current?.count, failed: !!current && current.count === undefined,
    counting: enabled && valid && !current, retry: () => setAttempt(n => n + 1), clear: () => setCompleted(null) };
}
