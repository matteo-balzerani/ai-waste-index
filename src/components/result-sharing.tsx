"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicResult } from "@/contracts";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { createShareModel } from "@/browser/sharing/model";
import { encodeShareCard } from "@/browser/sharing/card";

type Action = "text" | "badge" | "image";
export function ResultSharing({
  result,
  locale,
  analysis,
  copy,
  brand,
}: {
  result: PublicResult;
  locale: Locale;
  analysis: Dictionary["analysis"];
  copy: Dictionary["sharing"];
  brand: string;
}) {
  const model = useMemo(
    () => createShareModel(result, locale, analysis, copy, brand),
    [result, locale, analysis, copy, brand],
  );
  const [showCard, setShowCard] = useState(false);
  const [pending, setPending] = useState<Action | null>(null);
  const [message, setMessage] = useState("");
  const [manualText, setManualText] = useState<string | null>(null);
  const manual = useRef<HTMLTextAreaElement>(null);
  const cardHeading = useRef<HTMLHeadingElement>(null);
  const lifetime = useRef<AbortController | null>(null);
  const busy = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => {
      controller.abort();
      lifetime.current = null;
    };
  }, [model]);
  useEffect(() => {
    if (manualText !== null) {
      manual.current?.focus();
      manual.current?.select();
    }
  }, [manualText]);
  useEffect(() => {
    if (showCard) cardHeading.current?.focus();
  }, [showCard]);

  const copyOutput = async (action: Action) => {
    const controller = lifetime.current;
    if (busy.current || !controller || controller.signal.aborted) return;
    busy.current = true;
    setPending(action);
    setMessage("");
    setManualText(null);
    const text = action === "text" ? model.resultText : model.badgeText;
    try {
      if (action === "image") {
        if (
          !navigator.clipboard?.write ||
          typeof ClipboardItem === "undefined" ||
          (typeof ClipboardItem.supports === "function" &&
            !ClipboardItem.supports("image/png"))
        )
          throw new Error("COPY_UNAVAILABLE");
        const png = encodeShareCard(model, controller.signal);
        // Some implementations reject before consuming the Blob promise.
        void png.catch(() => {});
        // Invoke write in the click gesture; pass encoding as a promise to preserve activation.
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": png }),
        ]);
      } else {
        if (!navigator.clipboard?.writeText)
          throw new Error("COPY_UNAVAILABLE");
        await navigator.clipboard.writeText(text);
      }
      if (!controller.signal.aborted)
        setMessage(
          action === "image"
            ? copy.imageCopied
            : action === "badge"
              ? copy.badgeCopied
              : copy.textCopied,
        );
    } catch {
      if (!controller.signal.aborted) {
        if (action === "image") {
          setShowCard(true);
          setMessage(copy.imageFallback);
        } else {
          setManualText(text);
          setMessage(copy.textFallback);
        }
      }
    } finally {
      if (!controller.signal.aborted) {
        busy.current = false;
        setPending(null);
      }
    }
  };
  return (
    <section className="result-sharing" aria-labelledby="sharing-title">
      <h3 id="sharing-title">{copy.title}</h3>
      <p>{copy.description}</p>
      <div className="analysis-actions" aria-busy={pending !== null}>
        <button
          type="button"
          className="secondary-action"
          disabled={pending !== null}
          onClick={() => void copyOutput("text")}
        >
          {copy.copyText}
        </button>
        <button
          type="button"
          className="secondary-action"
          disabled={pending !== null}
          onClick={() => void copyOutput("badge")}
        >
          {copy.copyBadge}
        </button>
        <button
          type="button"
          className="secondary-action"
          aria-expanded={showCard}
          aria-controls="share-card-panel"
          onClick={() => setShowCard(true)}
        >
          {copy.showCard}
        </button>
      </div>
      <p role="status" aria-live="polite">
        {pending ? copy.pending : message}
      </p>
      {manualText !== null && (
        <div className="input-field">
          <label htmlFor="manual-share-text">{copy.manualLabel}</label>
          <textarea
            ref={manual}
            id="manual-share-text"
            readOnly
            value={manualText}
            rows={8}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      )}
      {showCard && (
        <div id="share-card-panel" className="share-card-panel">
          <h4 ref={cardHeading} tabIndex={-1}>
            {copy.cardTitle}
          </h4>
          <article className="share-card" aria-label={copy.cardTitle}>
            <p className="share-card-brand">{model.brand}</p>
            <p>{model.context}</p>
            <div className="share-card-score">
              <div>
                <p>{model.scoreLabel}</p>
                <strong>{model.score}</strong>
              </div>
              <div>
                <p>{model.classLabel}</p>
                <strong>{model.className}</strong>
              </div>
            </div>
            <p className="share-card-version">{model.methodology}</p>
            <p>{model.disclaimer}</p>
            {model.experimentalNotice && (
              <p className="share-card-demo">{model.experimentalNotice}</p>
            )}
            {model.demoNotice && (
              <p className="share-card-demo">{model.demoNotice}</p>
            )}
          </article>
          <button
            type="button"
            className="secondary-action"
            disabled={pending !== null}
            onClick={() => void copyOutput("image")}
          >
            {copy.copyImage}
          </button>
          <p className="input-hint">{copy.screenshotHint}</p>
        </div>
      )}
    </section>
  );
}
