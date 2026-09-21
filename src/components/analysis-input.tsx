"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type FormEvent,
} from "react";

import {
  createAnalysisTextSchema,
  createExtractionRequestSchema,
  createExtractionSuccessSchema,
  extractionErrorResponseSchemas,
  publicResultSchema,
  publicErrorResponseSchema,
  analyzeErrorResponseSchemas,
  type PublicResult,
  type PublicErrorCode,
} from "@/contracts";
import type { Locale } from "@/i18n/config";
import { AnalysisResult } from "./analysis-result";

import type { Dictionary } from "@/i18n/types";

const inputModes = ["text", "url", "screenshot"] as const;
type InputMode = (typeof inputModes)[number];

interface AnalysisInputProps {
  copy: Dictionary["inputShell"];
  dictionary: Dictionary;
  locale: Locale;
  maxTextCodePoints: number | null;
  maxUrlChars?: number | null;
}

export function AnalysisInput({
  copy,
  dictionary,
  locale,
  maxTextCodePoints,
  maxUrlChars = null,
}: AnalysisInputProps) {
  const [activeMode, setActiveMode] = useState<InputMode>("text");
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<PublicResult | null>(null);
  const [pending, setPending] = useState<"analyze" | "extract" | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const [error, setError] = useState<PublicErrorCode | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const discardDraft = () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
      setPending(null);
      setResult(null);
      setError(null);
      if (fileRef.current) fileRef.current.value = "";
      setDraft("");
      setPreview(null);
      setConfirmed(false);
      setActiveMode("text");
    };

    window.addEventListener("pagehide", discardDraft);
    window.addEventListener("pageshow", discardDraft);

    return () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
      window.removeEventListener("pagehide", discardDraft);
      window.removeEventListener("pageshow", discardDraft);
    };
  }, []);

  const selectMode = (mode: InputMode) => {
    if (mode !== activeMode) {
      activeRequest.current?.abort();
      activeRequest.current = null;
      setPending(null);
      setError(null);
      setDraft("");
      setPreview(null);
      setConfirmed(false);
      setActiveMode(mode);
    }
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | undefined;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % inputModes.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + inputModes.length) % inputModes.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = inputModes.length - 1;
    }

    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    const nextMode = inputModes[nextIndex];
    if (nextMode === undefined) {
      return;
    }
    selectMode(nextMode);
    tabRefs.current[nextIndex]?.focus();
  };

  const reset = () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setPending(null);
    setResult(null);
    setError(null);
    setDraft("");
    setPreview(null);
    setConfirmed(false);
    setActiveMode("text");
  };

  const hasPreview = preview !== null;
  useEffect(() => {
    if (hasPreview) previewHeading.current?.focus();
  }, [hasPreview]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      activeRequest.current ||
      (activeMode !== "text" &&
        !(activeMode === "url" && preview !== null && confirmed))
    )
      return;
    const text = preview ?? draft;
    if (maxTextCodePoints === null) {
      setError("INTERNAL_ERROR");
      return;
    }
    if (!createAnalysisTextSchema(maxTextCodePoints).safeParse(text).success) {
      setError(
        [...text].length > maxTextCodePoints
          ? "INPUT_TOO_LARGE"
          : "INVALID_INPUT",
      );
      return;
    }
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending("analyze");
    setError(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: activeMode === "url" ? "url" : "text",
          text,
          locale,
        }),
        cache: "no-store",
        credentials: "omit",
        signal: controller.signal,
      });
      const body: unknown = await response.json();
      if (activeRequest.current !== controller || controller.signal.aborted)
        return;
      if (response.status !== 200) {
        const schema =
          analyzeErrorResponseSchemas[
            response.status as keyof typeof analyzeErrorResponseSchemas
          ];
        const parsed = publicErrorResponseSchema.safeParse(body);
        setError(
          schema?.safeParse(body).success && parsed.success
            ? parsed.data.error.code
            : "INTERNAL_ERROR",
        );
        return;
      }
      const parsed = publicResultSchema.safeParse(body);
      if (!parsed.success) {
        setError("INTERNAL_ERROR");
        return;
      }
      setDraft("");
      setPreview(null);
      setConfirmed(false);
      setResult(parsed.data);
    } catch {
      if (activeRequest.current === controller && !controller.signal.aborted)
        setError("INTERNAL_ERROR");
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setPending(null);
      }
    }
  };

  const extract = async (event: FormEvent) => {
    event.preventDefault();
    if (activeRequest.current || activeMode !== "url") return;
    if (maxUrlChars === null || maxTextCodePoints === null) {
      setError("INTERNAL_ERROR");
      return;
    }
    if (
      !createExtractionRequestSchema(maxUrlChars).safeParse({ url: draft })
        .success
    ) {
      setError(
        [...draft].length > maxUrlChars ? "INPUT_TOO_LARGE" : "INVALID_INPUT",
      );
      return;
    }
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending("extract");
    setError(null);
    setPreview(null);
    setConfirmed(false);
    try {
      const response = await fetch("/api/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: draft }),
        cache: "no-store",
        credentials: "omit",
        signal: controller.signal,
      });
      const body: unknown = await response.json();
      if (activeRequest.current !== controller || controller.signal.aborted)
        return;
      if (response.status !== 200) {
        const schema =
          extractionErrorResponseSchemas[
            response.status as keyof typeof extractionErrorResponseSchemas
          ];
        const parsed = publicErrorResponseSchema.safeParse(body);
        setError(
          schema?.safeParse(body).success && parsed.success
            ? parsed.data.error.code
            : "INTERNAL_ERROR",
        );
        return;
      }
      const parsed =
        createExtractionSuccessSchema(maxTextCodePoints).safeParse(body);
      if (!parsed.success) {
        setError("INTERNAL_ERROR");
        return;
      }
      setDraft("");
      setPreview(parsed.data.text);
    } catch {
      if (activeRequest.current === controller && !controller.signal.aborted)
        setError("INTERNAL_ERROR");
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setPending(null);
      }
    }
  };

  if (result)
    return (
      <AnalysisResult
        result={result}
        locale={locale}
        copy={dictionary.analysis}
        onReset={reset}
      />
    );

  if (preview !== null)
    return (
      <section
        className="extraction-preview analysis-input"
        aria-labelledby="preview-title"
      >
        <h2 id="preview-title" ref={previewHeading} tabIndex={-1}>
          {dictionary.extraction.previewTitle}
        </h2>
        <p>{dictionary.apiMessages.EXTRACTION_CONFIRMATION_REQUIRED}</p>
        <form onSubmit={submit} aria-busy={pending !== null}>
          <div className="input-field">
            <label htmlFor="extracted-text">
              {dictionary.extraction.previewLabel}
            </label>
            <textarea
              id="extracted-text"
              value={preview}
              rows={12}
              autoComplete="off"
              spellCheck={false}
              readOnly={pending !== null}
              onChange={(event) => {
                setPreview(event.currentTarget.value);
                setConfirmed(false);
                setError(null);
              }}
            />
          </div>
          <label className="confirmation-control">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={pending !== null}
              onChange={(event) => setConfirmed(event.currentTarget.checked)}
            />
            {dictionary.extraction.confirmation}
          </label>
          <div className="analysis-actions">
            <button
              className="primary-action"
              type="submit"
              disabled={!confirmed || pending !== null}
            >
              {dictionary.extraction.analyze}
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() => {
                reset();
                setActiveMode("url");
              }}
            >
              {pending
                ? dictionary.analysis.cancel
                : dictionary.extraction.changeUrl}
            </button>
          </div>
          {pending && <p role="status">{dictionary.analysis.pending}</p>}
          {error && <p role="alert">{dictionary.apiMessages[error]}</p>}
        </form>
        <p className="privacy-notice">{dictionary.analysis.privacy}</p>
      </section>
    );

  const activeCopy = copy.modes[activeMode];
  const hintId = `input-${activeMode}-hint`;

  return (
    <section className="analysis-input" aria-labelledby="analysis-input-title">
      <div className="analysis-input-heading">
        <div>
          <p className="section-label">{copy.sectionLabel}</p>
          <h2 id="analysis-input-title">{copy.title}</h2>
          <p>{copy.introduction}</p>
        </div>
        <a className="estimate-link" href="#estimate-notice-title">
          {copy.estimateLink}
        </a>
      </div>

      <div
        aria-label={copy.modeSelectorLabel}
        className="input-tabs"
        role="tablist"
      >
        {inputModes.map((mode, index) => (
          <button
            aria-controls={`input-panel-${mode}`}
            aria-selected={activeMode === mode}
            className="input-tab"
            id={`input-tab-${mode}`}
            key={mode}
            onClick={() => selectMode(mode)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            role="tab"
            tabIndex={activeMode === mode ? 0 : -1}
            type="button"
          >
            <span aria-hidden="true">0{index + 1}</span>
            {copy.modes[mode].tabLabel}
          </button>
        ))}
      </div>

      <div
        aria-labelledby={`input-tab-${activeMode}`}
        className="input-panel"
        id={`input-panel-${activeMode}`}
        role="tabpanel"
        tabIndex={0}
      >
        <div className="input-panel-copy">
          <h3>{activeCopy.title}</h3>
          <p>{activeCopy.description}</p>
        </div>

        <div className="input-field">
          <label htmlFor={`input-${activeMode}`}>{activeCopy.fieldLabel}</label>

          {activeMode === "text" && (
            <textarea
              aria-describedby={hintId}
              autoComplete="off"
              id="input-text"
              onChange={(event) => setDraft(event.currentTarget.value)}
              readOnly={pending !== null}
              spellCheck={false}
              rows={8}
              value={draft}
            />
          )}

          {activeMode === "url" && (
            <input
              aria-describedby={hintId}
              autoComplete="off"
              id="input-url"
              inputMode="url"
              readOnly={pending !== null}
              onChange={(event) => setDraft(event.currentTarget.value)}
              type="url"
              value={draft}
            />
          )}

          {activeMode === "screenshot" && (
            <input
              aria-describedby={hintId}
              id="input-screenshot"
              ref={fileRef}
              type="file"
            />
          )}

          <p className="input-hint" id={hintId}>
            {activeCopy.fieldHint}
          </p>
        </div>
      </div>

      {activeMode === "text" ? (
        <form onSubmit={submit} aria-busy={pending !== null}>
          {maxTextCodePoints !== null && (
            <p className="input-hint">
              {dictionary.analysis.textLimit}:{" "}
              {new Intl.NumberFormat(locale).format(maxTextCodePoints)}
            </p>
          )}
          <div className="analysis-actions">
            <button
              className="primary-action"
              type="submit"
              disabled={pending !== null || maxTextCodePoints === null}
            >
              {dictionary.analysis.submit}
            </button>
            {pending && (
              <button
                className="secondary-action"
                type="button"
                onClick={reset}
              >
                {dictionary.analysis.cancel}
              </button>
            )}
          </div>
          {pending && <p role="status">{dictionary.analysis.pending}</p>}
          {(error || maxTextCodePoints === null) && (
            <p role="alert">
              {dictionary.apiMessages[error ?? "INTERNAL_ERROR"]}
            </p>
          )}
        </form>
      ) : activeMode === "url" ? (
        <form onSubmit={extract} aria-busy={pending !== null}>
          <p className="input-hint">{dictionary.extraction.availability}</p>
          {maxUrlChars !== null && (
            <p className="input-hint">
              {dictionary.extraction.urlLimit}:{" "}
              {new Intl.NumberFormat(locale).format(maxUrlChars)}
            </p>
          )}
          <div className="analysis-actions">
            <button
              className="primary-action"
              type="submit"
              disabled={
                pending !== null ||
                maxUrlChars === null ||
                maxTextCodePoints === null
              }
            >
              {dictionary.extraction.submit}
            </button>
            {pending && (
              <button
                className="secondary-action"
                type="button"
                onClick={() => {
                  reset();
                  setActiveMode("url");
                }}
              >
                {dictionary.analysis.cancel}
              </button>
            )}
          </div>
          {pending && <p role="status">{dictionary.extraction.pending}</p>}
          {(error || maxUrlChars === null || maxTextCodePoints === null) && (
            <p role="alert">
              {dictionary.apiMessages[error ?? "INTERNAL_ERROR"]}
            </p>
          )}
        </form>
      ) : (
        <p className="input-hint">{dictionary.analysis.unavailableMode}</p>
      )}

      <p className="privacy-notice">{copy.privacyNotice}</p>
    </section>
  );
}
