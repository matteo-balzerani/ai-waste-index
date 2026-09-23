"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicResult } from "@/contracts";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { createShareModel } from "@/browser/sharing/model";
import { themeStyle } from "@/presentation/theme";
import { SharePreview } from "./share-preview";
import { BrandMark } from "./brand-mark";
import { encodeShareCard } from "@/browser/sharing/card";

type Action = "text" | "badge" | "image" | "badgeImage";
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
  const [format, setFormat] = useState<"card" | "badge">("badge");
  const [pending, setPending] = useState<Action | null>(null);
  const [message, setMessage] = useState("");
  const [manualText, setManualText] = useState<string | null>(null);
  const manual = useRef<HTMLTextAreaElement>(null);
  const cardHeading = useRef<HTMLHeadingElement>(null);
  const lifetime = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const opener = useRef<HTMLButtonElement>(null);
  const close = () => {
    if (busy.current) return;
    setShowCard(false); setMessage(""); setManualText(null);
    opener.current?.focus();
  };
  const chooseFormat = (next: "card" | "badge") => {
    setFormat(next); setMessage(""); setManualText(null);
  };
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
      if (action === "image" || action === "badgeImage") {
        if (
          !navigator.clipboard?.write ||
          typeof ClipboardItem === "undefined" ||
          (typeof ClipboardItem.supports === "function" &&
            !ClipboardItem.supports("image/png"))
        )
          throw new Error("COPY_UNAVAILABLE");
        const png = encodeShareCard(model, controller.signal, action === "badgeImage" ? "badge" : "card");
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
          (action === "image" || action === "badgeImage")
            ? copy.imageCopied
            : action === "badge"
              ? copy.badgeCopied
              : copy.textCopied,
        );
    } catch {
      if (!controller.signal.aborted) {
        if (action === "image" || action === "badgeImage") {
          setFormat(action === "badgeImage" ? "badge" : "card");
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
  const feedback = <p role="status" aria-live="polite">{pending ? copy.pending : message}</p>;
  const manualFallback = manualText !== null && (
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
      );
  return (
    <section style={themeStyle} className="result-sharing" aria-labelledby="sharing-title">
      <h3 id="sharing-title" className="sr-only">{copy.title}</h3>
      <div className="analysis-actions" aria-busy={pending !== null}>
        <button ref={opener} type="button" className="primary-action" disabled={pending !== null} aria-expanded={showCard}
          aria-controls="share-card-panel" onClick={() => { if (showCard) close(); else { setMessage(""); setManualText(null); setShowCard(true); } }}>{copy.open}</button>
        <button type="button" className="text-action" disabled={pending !== null}
          onClick={() => void copyOutput("text")}>{copy.copyText}</button>
      </div>
      {!showCard && <>{feedback}{manualFallback}</>}
      {showCard && (
        <div id="share-card-panel" className="share-card-panel" onKeyDown={event => {
          if (event.key === "Escape") { event.preventDefault(); close(); }
        }}>
          <div className="share-panel-heading">
            <h4 ref={cardHeading} tabIndex={-1}>{format === "badge" ? copy.badgeTitle : copy.cardTitle}</h4>
            <button type="button" className="text-action" disabled={pending !== null} onClick={close}>{copy.close}</button>
          </div>
          <div className="share-toolbar">
          <div className="share-formats" role="group" aria-label={copy.formatLabel}>
            <button type="button" className="secondary-action" disabled={pending !== null} aria-pressed={format === "badge"}
              onClick={() => chooseFormat("badge")}>{copy.showBadge}</button>
            <button type="button" className="secondary-action" disabled={pending !== null} aria-pressed={format === "card"}
              onClick={() => chooseFormat("card")}>{copy.showCard}</button>
          </div>
          <button
            type="button"
            className="secondary-action"
            disabled={pending !== null}
            onClick={() => void copyOutput(format === "badge" ? "badgeImage" : "image")}
          >
            {format === "badge" ? copy.copyBadgeImage : copy.copyImage}
          </button>
          {format === "badge" && <button type="button" className="text-action" disabled={pending !== null} onClick={() => void copyOutput("badge")}>{copy.copyBadge}</button>}
          </div>
          {feedback}{manualFallback}
          <SharePreview key={format} model={model} format={format} zoomIn={copy.zoomIn} zoomOut={copy.zoomOut}>
          <article className={`share-card ${format === "badge" ? "compact" : ""}`} aria-label={format === "badge" ? copy.badgeTitle : copy.cardTitle}>
            <p className="share-card-brand"><BrandMark />{model.brand}</p>
            <p className="share-card-context">{model.context}</p>
            <div className="share-card-score">
              <div>
                <p>{model.scoreLabel}</p>
                <strong>{model.score}</strong>
              </div>
              <div className="share-card-class">
                <p>{model.classLabel}</p>
                <strong>{model.className}</strong>
              </div>
            </div>
            {format === "card" && <div className="share-metrics">{model.metrics.map(metric =>
              <p key={metric.label}>{metric.label}<strong>{metric.value}</strong><span>{metric.range}</span></p>
            )}</div>}
            <div className="share-card-footer">
            <p className="share-card-version">{model.methodology}</p>
            <p>{model.disclaimer}</p>
            {model.experimentalNotice && (
              <p className="share-card-demo">{model.experimentalNotice}</p>
            )}
            {model.demoNotice && (
              <p className="share-card-demo">{model.demoNotice}</p>
            )}
            </div>
          </article>
          </SharePreview>


        </div>
      )}
    </section>
  );
}
