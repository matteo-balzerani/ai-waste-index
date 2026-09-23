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
import { BrandMark } from "./brand-mark";

import { recognizeScreenshot } from "@/browser/ocr/client";
import { screenshotMimeTypes } from "@/browser/ocr/image";
import { OcrError, type OcrLimits } from "@/browser/ocr/types";

import type { Dictionary } from "@/i18n/types";

const inputModes = ["text", "url", "screenshot"] as const;
type InputMode = (typeof inputModes)[number];

interface AnalysisInputProps {
  copy: Dictionary["inputShell"];
  dictionary: Dictionary;
  locale: Locale;
  maxTextCodePoints: number | null;
  maxUrlChars?: number | null;
  ocrLimits?: OcrLimits | null;
}

export function AnalysisInput({
  copy,
  dictionary,
  locale,
  maxTextCodePoints,
  maxUrlChars = null,
  ocrLimits = null,
}: AnalysisInputProps) {
  const [activeMode, setActiveMode] = useState<InputMode>("text");
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<PublicResult | null>(null);
  const [pending, setPending] = useState<"analyze" | "extract" | "ocr" | null>(
    null,
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const [error, setError] = useState<PublicErrorCode | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const resetFocus = useRef(false);
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
    resetFocus.current = true;
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

  useEffect(() => {
    if (resetFocus.current && !result && preview === null && pending === null) {
      document.getElementById(`input-${activeMode}`)?.focus();
      resetFocus.current = false;
    }
  }, [result, preview, pending, activeMode]);

  const hasPreview = preview !== null;
  useEffect(() => {
    if (hasPreview) previewHeading.current?.focus();
  }, [hasPreview]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      activeRequest.current ||
      (activeMode !== "text" && !(preview !== null && confirmed))
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
          sourceType: activeMode,
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

  const extractScreenshot = async (file: File) => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setError(null);
    setPreview(null);
    setConfirmed(false);
    setOcrProgress(null);
    if (!ocrLimits || maxTextCodePoints === null) {
      setError("INTERNAL_ERROR");
      return;
    }
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending("ocr");
    try {
      const text = await recognizeScreenshot(file, {
        limits: ocrLimits,
        maxTextCodePoints,
        signal: controller.signal,
        onProgress: (value) => {
          if (
            activeRequest.current === controller &&
            !controller.signal.aborted
          )
            setOcrProgress(value);
        },
      });
      if (activeRequest.current === controller && !controller.signal.aborted)
        setPreview(text);
    } catch (failure) {
      if (activeRequest.current === controller && !controller.signal.aborted)
        setError(
          failure instanceof OcrError ? failure.code : "EXTRACTION_FAILED",
        );
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setPending(null);
      }
    }
  };

  const draftError = error !== null && [
    "INVALID_INPUT", "INPUT_TOO_LARGE", "ESTIMATE_OUT_OF_DOMAIN",
    "URL_BLOCKED", "URL_FETCH_FAILED", "EXTRACTION_FAILED",
  ].includes(error);
  const fieldInvalid = error === "INVALID_INPUT" || error === "INPUT_TOO_LARGE";
  const errorMessage = error === "INVALID_INPUT" && activeMode === "text" && !(preview ?? draft).trim()
    ? dictionary.analysis.emptyInput
    : dictionary.apiMessages[error ?? "INTERNAL_ERROR"];
  const changeDraft = (value: string) => {
    setDraft(value);
    if (draftError) setError(null);
  };

  if (result)
    return (
      <AnalysisResult
        result={result}
        locale={locale}
        copy={dictionary.analysis}
        sharing={dictionary.sharing}
        brand={dictionary.landing.brand}
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

        <p className="sr-only">{dictionary.apiMessages.EXTRACTION_CONFIRMATION_REQUIRED}</p>
        <form onSubmit={submit} aria-busy={pending !== null}>
          <div className="input-field">
            <label htmlFor="extracted-text">
              {dictionary.extraction.previewLabel}
            </label>
            <textarea
              id="extracted-text"
              aria-invalid={fieldInvalid || undefined}
              aria-describedby={draftError ? "input-error" : undefined}
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
              {pending ? dictionary.analysis.loadingLabel : dictionary.extraction.analyze}
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() => {
                reset();
                setActiveMode(activeMode);
              }}
            >
              {pending
                ? dictionary.analysis.cancel
                : activeMode === "screenshot"
                  ? dictionary.ocr.changeImage
                  : dictionary.extraction.changeUrl}
            </button>
          </div>
          {pending && <p className="sr-only" role="status">{dictionary.analysis.pending}</p>}
          {error && <p id="input-error" role="alert">{errorMessage}</p>}
        </form>

      </section>
    );

  const activeCopy = copy.modes[activeMode];
  const hintId = `input-${activeMode}-hint`;

  return (
    <section className="analysis-input" aria-labelledby="analysis-input-title">
      <div className="hero">
        <div className="hero-symbol" aria-hidden="true"><BrandMark /></div>
        <h1>{dictionary.landing.title}</h1>
        <h2 id="analysis-input-title" className="sr-only">{copy.title}</h2>
      </div>
      <div className="composer">
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
            <span aria-hidden="true" className="tab-icon">{mode === "text" ? "Tt" : mode === "url" ? "↗" : "▧"}</span>
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
        <div className="input-field">
          <label className={activeMode === "screenshot" ? "upload-label" : "sr-only"} htmlFor={`input-${activeMode}`}>{activeMode === "screenshot" && <svg className="upload-icon" aria-hidden="true" viewBox="0 0 48 48"><path d="M24 34V14m-9 9 9-9 9 9" fill="none" stroke="currentColor" strokeWidth="2" /></svg>}<span role={pending === "ocr" ? "status" : undefined}>{pending === "ocr" ? dictionary.ocr.pending : activeCopy.fieldLabel}</span>
            {pending === "ocr" && <progress aria-label={dictionary.ocr.pending} max={1} value={ocrProgress ?? undefined} />}
          </label>

          {activeMode === "text" && (
            <textarea
              aria-describedby={`${hintId}${draftError ? " input-error" : ""}`}
              aria-invalid={fieldInvalid || undefined}
              autoComplete="off"
              id="input-text"
              placeholder={activeCopy.title}
              onChange={(event) => changeDraft(event.currentTarget.value)}
              readOnly={pending !== null}
              spellCheck={false}
              rows={8}
              value={draft}
            />
          )}

          {activeMode === "url" && (
            <input
              aria-describedby={`${hintId}${draftError ? " input-error" : ""}`}
              aria-invalid={fieldInvalid || undefined}
              autoComplete="off"
              id="input-url"
              form="url-extraction-form"
              placeholder={activeCopy.title}
              inputMode="url"
              readOnly={pending !== null}
              onChange={(event) => changeDraft(event.currentTarget.value)}
              type="url"
              value={draft}
            />
          )}

          {activeMode === "screenshot" && (
            <input
              aria-describedby={`${hintId}${draftError ? " input-error" : ""}`}
              aria-invalid={fieldInvalid || undefined}
              id="input-screenshot"
              aria-label={activeCopy.fieldLabel}
              accept={screenshotMimeTypes.join(",")}
              disabled={!ocrLimits || maxTextCodePoints === null}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) void extractScreenshot(file);
              }}
              ref={fileRef}
              type="file"
            />
          )}

          <p className="sr-only" id={hintId}>
            {activeCopy.fieldHint}
          </p>
        </div>
      </div>

      {activeMode === "text" ? (
        <form onSubmit={submit} aria-busy={pending !== null}>
          {maxTextCodePoints !== null && (
            <p className="input-counter">
              <span className="sr-only">{dictionary.analysis.textLimit}</span>{new Intl.NumberFormat(locale).format([...draft].length)} / {" "}
              {new Intl.NumberFormat(locale).format(maxTextCodePoints)}
            </p>
          )}
          <div className="analysis-actions">
            <button
              className="primary-action"
              type="submit"
              disabled={pending !== null || maxTextCodePoints === null}
            >
              {pending ? dictionary.analysis.loadingLabel : dictionary.analysis.submit}<span aria-hidden="true">↗</span>
            </button>
            <button
                style={{ visibility: pending ? "visible" : "hidden" }}
                disabled={!pending} aria-hidden={!pending} tabIndex={pending ? 0 : -1}
                className="secondary-action"
                type="button"
                onClick={reset}
              >
                {dictionary.analysis.cancel}
              </button>
          </div>
          {pending && <p className="sr-only" role="status">{dictionary.analysis.pending}</p>}
          {(error || maxTextCodePoints === null) && (
            <p id="input-error" role="alert">
              {errorMessage}
            </p>
          )}
        </form>
      ) : activeMode === "url" ? (
        <form id="url-extraction-form" noValidate onSubmit={extract} aria-busy={pending !== null}>

          {maxUrlChars !== null && (
            <p className="sr-only">
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
              {pending ? dictionary.extraction.loadingLabel : dictionary.extraction.submit}<span aria-hidden="true">↗</span>
            </button>
            <button
                style={{ visibility: pending ? "visible" : "hidden" }}
                disabled={!pending} aria-hidden={!pending} tabIndex={pending ? 0 : -1}
                className="secondary-action"
                type="button"
                onClick={() => {
                  reset();
                  setActiveMode("url");
                }}
              >
                {dictionary.analysis.cancel}
              </button>
          </div>
          {pending && <p className="sr-only" role="status">{dictionary.extraction.pending}</p>}
          {(error || maxUrlChars === null || maxTextCodePoints === null) && (
            <p id="input-error" role="alert">
              {errorMessage}
            </p>
          )}
        </form>
      ) : (
        <div aria-busy={pending === "ocr"}>
          <p className="input-hint upload-formats">{dictionary.ocr.formats}</p>
          {ocrLimits && (
            <p className="sr-only">
              {dictionary.ocr.limits
                .replace(
                  "{bytes}",
                  new Intl.NumberFormat(locale).format(
                    ocrLimits.maxBytes / 1_000_000,
                  ),
                )
                .replace(
                  "{width}",
                  new Intl.NumberFormat(locale).format(ocrLimits.maxWidth),
                )
                .replace(
                  "{height}",
                  new Intl.NumberFormat(locale).format(ocrLimits.maxHeight),
                )
                .replace(
                  "{pixels}",
                  new Intl.NumberFormat(locale).format(
                    ocrLimits.maxPixels / 1_000_000,
                  ),
                )}
            </p>
          )}
          {pending === "ocr" && (
            <>
              <button
                className="secondary-action"
                type="button"
                onClick={() => {
                  reset();
                  setActiveMode("screenshot");
                }}
              >
                {dictionary.analysis.cancel}
              </button>
            </>
          )}
          {(error || !ocrLimits || maxTextCodePoints === null) && (
            <p id="input-error" role="alert">
              {error === "EXTRACTION_FAILED"
                ? dictionary.ocr.failed
                : error === "REQUEST_TIMEOUT"
                  ? dictionary.ocr.timeout
                  : dictionary.apiMessages[error ?? "INTERNAL_ERROR"]}
            </p>
          )}
        </div>
      )}

      </div>
    </section>
  );
}
