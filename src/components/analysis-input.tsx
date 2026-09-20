"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import type { Dictionary } from "@/i18n/types";

const inputModes = ["text", "url", "screenshot"] as const;
type InputMode = (typeof inputModes)[number];

interface AnalysisInputProps {
  copy: Dictionary["inputShell"];
}

export function AnalysisInput({ copy }: AnalysisInputProps) {
  const [activeMode, setActiveMode] = useState<InputMode>("text");
  const [draft, setDraft] = useState("");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const discardDraft = () => {
      setDraft("");
      setActiveMode("text");
    };

    window.addEventListener("pagehide", discardDraft);
    window.addEventListener("pageshow", discardDraft);

    return () => {
      window.removeEventListener("pagehide", discardDraft);
      window.removeEventListener("pageshow", discardDraft);
    };
  }, []);

  const selectMode = (mode: InputMode) => {
    if (mode !== activeMode) {
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
              type="file"
            />
          )}

          <p className="input-hint" id={hintId}>
            {activeCopy.fieldHint}
          </p>
        </div>
      </div>

      <p className="privacy-notice">{copy.privacyNotice}</p>
    </section>
  );
}
