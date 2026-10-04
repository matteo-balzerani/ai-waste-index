"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { advancedCatalogSchema, advancedRequestSchema, advancedResultSchema,
  type AdvancedCatalog, type AdvancedRequest, type AdvancedResult } from "@/contracts/advanced";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { useTokenCount } from "@/browser/tokens/use-token-count";
import { textInputError, textTokenSource, TOKENIZER_LABEL, type TokenSource } from "@/browser/tokens/types";

const usageLinks: Record<string, string> = {
  openai: "https://developers.openai.com/api/docs/guides/token-counting",
  anthropic: "https://platform.claude.com/docs/en/api/messages/create",
  google_genai: "https://ai.google.dev/gemini-api/docs/generate-content/tokens",
  mistralai: "https://docs.mistral.ai/api/endpoint/chat",
};

export interface AdvancedInputHandle { suspend(): void }

export function AdvancedInput({ dictionary: d, locale = "en", active = true, ref }: {
  dictionary: Dictionary; locale?: Locale; active?: boolean; ref?: Ref<AdvancedInputHandle>;
}) {
  const c = d.advanced;
  const [catalog, setCatalog] = useState<AdvancedCatalog | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [tokens, setTokens] = useState("");
  const [inputPath, setInputPath] = useState<"text" | "tokens">("text");
  const [duration, setDuration] = useState("");
  const [reference, setReference] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ data: AdvancedResult; input: AdvancedRequest; tokenSource: TokenSource } | null>(null);
  const counted = useTokenCount(reference, active && inputPath === "text");
  const tokenSource = inputPath === "tokens" ? "declared" : textTokenSource(provider, model);
  const tokenLabels = { declared: c.declaredTokens, "text-matched": c.matchedTokens, "text-reference": c.referenceTokens };
  const tokenHint = tokenSource === "text-matched" ? c.matchedHint : c.approximationHint;
  const usageProvider = Object.hasOwn(usageLinks, provider) ? provider as keyof typeof c.usageHints : "generic";
  const request = useRef<AbortController | null>(null);
  const catalogRequest = useRef<AbortController | null>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const errorElement = useRef<HTMLParagraphElement>(null);
  const providerElement = useRef<HTMLSelectElement>(null);
  const format = new Intl.NumberFormat(locale, { maximumSignificantDigits: 4 });

  const suspend = () => {
    request.current?.abort(); request.current = null;
    setPending(false);
  };
  useImperativeHandle(ref, () => ({ suspend }));
  useEffect(() => {
    if (!active || catalog) return;
    const controller = new AbortController();
    catalogRequest.current = controller;
    const timer = setTimeout(() => controller.abort(), 10_000);
    let cancelled = false;
    void fetch("/api/advanced/models", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error();
        const parsed = advancedCatalogSchema.parse(await response.json());
        if (!cancelled && !controller.signal.aborted) { setCatalog(parsed); setCatalogError(false); }
      }).catch(() => { if (!cancelled) setCatalogError(true); })
      .finally(() => clearTimeout(timer));
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [active, attempt, catalog]);
  useEffect(() => () => { request.current?.abort(); catalogRequest.current?.abort(); }, []);
  useEffect(() => { if (result && active) resultHeading.current?.focus(); }, [result, active]);
  useEffect(() => { if (error && active) errorElement.current?.focus(); }, [error, active]);

  const changed = () => { suspend(); setResult(null); setError(null); };
  const submit = async () => {
    changed();
    if (!catalog?.providers.some(p => p.id === provider && p.models.includes(model))) return setError(c.selectionError);
    if (inputPath === "tokens" && (!/^\d{1,7}$/.test(tokens) || Number(tokens) < 1 || Number(tokens) > 1_000_000)) return setError(c.tokenError);
    if (inputPath === "text") {
      const invalid = textInputError(reference);
      if (invalid) return setError(c[invalid]);
      if (counted.count === undefined) return setError(counted.failed ? c.tokenizerUnavailable : c.counting);
    }
    const seconds = duration === "" ? undefined : Number(duration.replace(",", "."));
    if (duration !== "" && (!/^\d+(?:[.,]\d+)?$/.test(duration) || !Number.isFinite(seconds)
      || seconds! <= 0 || seconds! > 3600)) return setError(c.durationError);
    const input = advancedRequestSchema.parse({ provider, model, outputTokens: inputPath === "tokens" ? Number(tokens) : counted.count,
      ...(seconds === undefined ? {} : { requestLatencySeconds: seconds }) });
    const controller = new AbortController(); request.current = controller;
    setPending(true);
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch("/api/advanced/estimate", { method: "POST", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: controller.signal });
      const body: unknown = await response.json();
      if (request.current !== controller) return;
      if (controller.signal.aborted) throw new Error();
      if (!response.ok) {
        const code = (body as { error?: { code?: string } })?.error?.code;
        const messages: Record<string, string> = { INVALID_INPUT: d.apiMessages.INVALID_INPUT,
          ESTIMATE_OUT_OF_DOMAIN: d.apiMessages.ESTIMATE_OUT_OF_DOMAIN, INPUT_TOO_LARGE: d.apiMessages.INPUT_TOO_LARGE,
          REQUEST_TIMEOUT: d.apiMessages.REQUEST_TIMEOUT, GUARD_UNAVAILABLE: c.unavailable,
          ESTIMATOR_UNAVAILABLE: c.unavailable };
        setError(messages[code ?? ""] ?? c.unavailable); return;
      }
      const data = advancedResultSchema.parse(body);
      if (data.durationSource !== (seconds === undefined ? "estimated" : "declared")
        || data.methodologyVersion !== catalog.methodologyVersion || data.source.version !== catalog.source.version) throw new Error();
      setResult({ data, input, tokenSource });
    } catch {
      if (request.current === controller) setError(c.unavailable);
    } finally {
      clearTimeout(timer);
      if (request.current === controller) { request.current = null; setPending(false); }
    }
  };
  const reset = () => {
    changed(); setProvider(""); setModel(""); setTokens(""); setDuration(""); setReference("");
    setInputPath("text"); counted.clear();
    providerElement.current?.focus();
  };
  const identity = result?.data ?? catalog;

  return <main className="landing-main advanced-main"><section className="advanced-stack" aria-labelledby="advanced-title">
    <h1 id="advanced-title">{c.title}</h1><p>{c.notice}</p>
    <p className="prototype-chip">{c.experimental}</p>
    {!catalog && (catalogError ? <div className="advanced-stack" role="status"><p>{c.unavailable}</p>
      <button type="button" className="secondary-action" onClick={() => { setCatalogError(false); setAttempt(n => n + 1); }}>{c.retry}</button>
    </div> : <p role="status">{c.loadingModels}</p>)}
    <form className="composer advanced-stack" noValidate onSubmit={event => { event.preventDefault(); void submit(); }}>
      <div className="advanced-grid">
        <div className="input-field"><label htmlFor="advanced-provider">{c.provider}</label>
          <select id="advanced-provider" ref={providerElement} value={provider} disabled={!catalog}
            onChange={event => { changed(); setProvider(event.currentTarget.value); setModel(""); }}>
            <option value="">{c.chooseProvider}</option>
            {catalog?.providers.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select></div>
        <div className="input-field"><label htmlFor="advanced-model">{c.model}</label>
          <select id="advanced-model" value={model} disabled={!provider || !catalog}
            onChange={event => { changed(); setModel(event.currentTarget.value); }}>
            <option value="">{c.chooseModel}</option>
            {catalog?.providers.find(p => p.id === provider)?.models.map(name => <option key={name}>{name}</option>)}
          </select></div>
      </div>
      <fieldset className="advanced-kind"><legend>{c.inputPath}</legend>
        {(["text", "tokens"] as const).map(path => <label key={path}>
          <input type="radio" name="advanced-input-path" value={path} checked={inputPath === path}
            onChange={() => { changed(); setInputPath(path); }} />
          {path === "text" ? c.fromText : c.fromTokens}
        </label>)}
      </fieldset>
      {inputPath === "text" ? <div className="input-field">
        <label htmlFor="advanced-text">{c.generatedText}</label>
        <textarea id="advanced-text" autoComplete="off" spellCheck={false} value={reference}
          aria-describedby="advanced-text-hint advanced-count-hint"
          aria-invalid={error === c.emptyText || error === c.tooLarge || error === c.invalidText || undefined}
          onChange={event => { changed(); setReference(event.currentTarget.value); }} />
        <p id="advanced-text-hint" className="input-hint">{c.textHint}</p>
        <p id="advanced-count-hint" className="input-hint">{model ? tokenHint : c.selectForTokenHint}</p>
        <p className="input-hint">{c.hiddenTokens}</p>
        <div role="status" aria-live="polite">
          {counted.counting && <p>{c.counting}</p>}
          {counted.count !== undefined && <p data-testid="advanced-token-count">
            {c.outputTokens}: {new Intl.NumberFormat(locale).format(counted.count)}
          </p>}
          {counted.failed && <p>{c.tokenizerUnavailable}</p>}
        </div>
        {counted.failed && <button type="button" className="secondary-action"
          onClick={() => { changed(); counted.retry(); }}>{c.retryTokens}</button>}
      </div> : <div className="input-field"><label htmlFor="advanced-tokens">{c.outputTokens}</label>
        <input id="advanced-tokens" type="text" inputMode="numeric" autoComplete="off" value={tokens}
          aria-describedby="advanced-token-hint" aria-invalid={error === c.tokenError || undefined}
          onChange={event => { changed(); setTokens(event.currentTarget.value); }} />
        <p className="input-hint" id="advanced-token-hint">{c.tokenHint}</p>
        <details className="advanced-details"><summary>{c.usageHelp}</summary>
          <p className="input-hint">{c.usageHints[usageProvider]}</p>
          {usageProvider !== "generic" && <a href={usageLinks[usageProvider]} target="_blank" rel="noreferrer">{c.usageDocs}</a>}
        </details>
      </div>}
      <div className="input-field"><label htmlFor="advanced-duration">{c.duration}</label>
        <input id="advanced-duration" type="text" inputMode="decimal" autoComplete="off" value={duration}
          aria-describedby="advanced-duration-hint" aria-invalid={error === c.durationError || undefined}
          onChange={event => { changed(); setDuration(event.currentTarget.value); }} />
        <p className="input-hint" id="advanced-duration-hint">{c.durationHint}</p></div>
      {error && <p ref={errorElement} role="alert" tabIndex={-1}>{error}</p>}
      <div className="analysis-actions">
        <button type="submit" className="primary-action" disabled={!catalog || pending || counted.counting}>{c.submit}</button>
        {pending && <button type="button" className="secondary-action" onClick={suspend}>{c.cancel}</button>}
        <button type="button" className="text-action" onClick={reset}>{c.reset}</button>
      </div>
      {pending && <p role="status">{c.pending}</p>}
    </form>
    {result && <section className="composer advanced-stack" aria-labelledby="advanced-result-title">
      <h2 id="advanced-result-title" ref={resultHeading} tabIndex={-1}>{c.resultTitle}</h2>
      <dl className="advanced-summary"><div><dt>{c.energy} — {result.data.energyWh.kind === "range" ? c.range : c.point}</dt>
        <dd data-testid="advanced-energy">{result.data.energyWh.kind === "range"
          ? `${format.format(result.data.energyWh.low)}–${format.format(result.data.energyWh.high)}`
          : format.format(result.data.energyWh.value)} Wh</dd></div>
        <div><dt>{c.provider}</dt><dd>{catalog?.providers.find(p => p.id === result.input.provider)?.label}</dd></div>
        <div><dt>{c.model}</dt><dd>{result.input.model}</dd></div>
        <div><dt>{c.outputTokens}</dt><dd>{new Intl.NumberFormat(locale).format(result.input.outputTokens)}</dd></div>
        <div><dt>{c.tokenProvenance}</dt><dd>{tokenLabels[result.tokenSource]}</dd></div>
      </dl>
      {result.tokenSource !== "declared" && <>
        <p>{result.tokenSource === "text-matched" ? c.matchedHint : c.approximationHint}</p>
        <p>{c.hiddenTokens}</p>
      </>}
      <p>{result.data.durationSource === "estimated" ? c.estimatedDuration
        : c.declaredDuration.replace("{seconds}", format.format(result.input.requestLatencySeconds!))}</p>
      {result.data.warnings.map(code => <p key={code} className="input-hint">{c.warnings[code]}</p>)}
      <button type="button" className="secondary-action" onClick={() => { changed(); providerElement.current?.focus(); }}>{c.edit}</button>
    </section>}
    {identity && <p className="version-label">{c.source}: {identity.source.name} {identity.source.version}<br />
      {c.version}: {identity.methodologyVersion}</p>}
    <details className="advanced-details"><summary>{c.method}</summary><div className="advanced-stack">
      <p>{c.scope}</p><p>{c.limitations}</p><p>{c.latencyExplanation}</p><p>{c.privacy}</p>
      <p>{c.tokenizerDetails} {TOKENIZER_LABEL}.</p>
      <a href="https://ecologits.ai/latest/methodology/llm_inference/" target="_blank" rel="noreferrer">{c.sourceLink}</a>
    </div></details>
  </section></main>;
}
