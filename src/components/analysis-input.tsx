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
}

export function AnalysisInput({
  copy,
  dictionary,
  locale,
  maxTextCodePoints,
}: AnalysisInputProps) {
  const [activeMode, setActiveMode] = useState<InputMode>("text");
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<PublicResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<PublicErrorCode | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const discardDraft = () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
      setPending(false);
      setResult(null);
      setError(null);
      if (fileRef.current) fileRef.current.value = "";
      setDraft("");
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
      setPending(false);
      setError(null);
      setDraft("");
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
    setPending(false);
    setResult(null);
    setError(null);
    setDraft("");
    setActiveMode("text");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (activeRequest.current || activeMode !== "text") return;
    if (maxTextCodePoints === null) {
      setError("INTERNAL_ERROR");
      return;
    }
    if (!createAnalysisTextSchema(maxTextCodePoints).safeParse(draft).success) {
      setError(
        [...draft].length > maxTextCodePoints
          ? "INPUT_TOO_LARGE"
          : "INVALID_INPUT",
      );
      return;
    }
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType: "text", text: draft, locale }),
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
      setResult(parsed.data);
    } catch {
      if (activeRequest.current === controller && !controller.signal.aborted)
        setError("INTERNAL_ERROR");
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setPending(false);
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
              readOnly={pending}
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
        <form onSubmit={submit} aria-busy={pending}>
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
              disabled={pending || maxTextCodePoints === null}
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
      ) : (
        <p className="input-hint">{dictionary.analysis.unavailableMode}</p>
      )}

      <p className="privacy-notice">{copy.privacyNotice}</p>
    </section>
  );
}
