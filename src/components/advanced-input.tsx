"use client";

import { useEffect, useRef, useState } from "react";
import {
  emptyDetails, parseConversation, prototypeMessageLimit, prototypeTextLimit, validDetails,
  type ConversationMessage, type MessageRole,
} from "@/browser/advanced/conversation";
import type { Dictionary } from "@/i18n/types";
import { AdvancedDetails, AdvancedParameterSummary } from "./advanced-details";

export function AdvancedInput({ dictionary: d }: { dictionary: Dictionary }) {
  const c = d.advanced;
  const [kind, setKind] = useState<"text" | "chat">("text");
  const [text, setText] = useState("");
  const [paste, setPaste] = useState("");
  const [reference, setReference] = useState("");
  const [details, setDetails] = useState(emptyDetails);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<{ id: string } | null>(null);
  const nextId = useRef(0);
  const textareas = useRef(new Map<number, HTMLTextAreaElement>());

  useEffect(() => {
    if (focusTarget) document.getElementById(focusTarget.id)?.focus();
  }, [focusTarget]);

  const focus = (id: string) => setFocusTarget({ id });
  const changed = () => { setConfirmed(false); setError(null); setResult(false); };
  const update = (id: number, patch: Partial<ConversationMessage>) => {
    changed();
    setMessages(current => current.map(message => message.id === id ? { ...message, ...patch } : message));
  };
  const fail = (message: string) => { setError(message); focus("advanced-error"); };
  const contentTooLarge = (value: string) => [...value].length > prototypeTextLimit;
  const conversationValid = messages.length > 0 && messages.every(message =>
    message.role !== "unknown" && message.content.trim() && validDetails(message)) &&
    messages.some(message => message.role === "assistant");

  const review = () => {
    changed();
    if (!paste.trim()) return fail(c.emptyError);
    if (contentTooLarge(paste + reference)) return fail(c.tooLarge);
    const parsed = parseConversation(paste);
    if (parsed.length > prototypeMessageLimit) return fail(c.tooMany);
    setMessages(parsed.map(message => ({ ...emptyDetails(), ...message, id: nextId.current++ })));
    setReviewing(true);
    focus("advanced-review-title");
  };

  const add = () => {
    changed();
    if (messages.length >= prototypeMessageLimit) return fail(c.tooMany);
    const id = nextId.current++;
    setMessages(current => [...current, { ...emptyDetails(), id, role: "unknown", content: "" }]);
    focus(`message-${id}-role`);
  };

  const split = (message: ConversationMessage) => {
    const position = textareas.current.get(message.id)?.selectionStart ?? 0;
    const before = message.content.slice(0, position);
    const after = message.content.slice(position);
    if (!before.trim() || !after.trim()) return fail(c.splitError);
    if (messages.length >= prototypeMessageLimit) return fail(c.tooMany);
    changed();
    const id = nextId.current++;
    // Counts cannot be attributed to either new response automatically.
    setMessages(current => current.flatMap(item => item.id === message.id ? [
      { ...item, content: before, inputTokens: "", outputTokens: "" },
      { ...emptyDetails(), id, role: "unknown" as const, content: after },
    ] : [item]));
    focus(`message-${id}-role`);
  };

  const showPreview = () => {
    const applicableDetails = kind === "text" ? details : { ...details, inputTokens: "", outputTokens: "" };
    if (!validDetails(applicableDetails) || (kind === "chat" && messages.some(message => !validDetails(message)))) {
      return fail(c.tokenError + " " + c.detailsError);
    }
    if (kind === "text" && !text.trim()) return fail(c.emptyError);
    if (kind === "chat" && (!reviewing || !confirmed || !conversationValid)) return fail(c.reviewError);
    if (contentTooLarge(kind === "text" ? text : messages.map(message => message.content).join("") + reference)) {
      return fail(c.tooLarge);
    }
    setError(null);
    setResult(true);
    focus("advanced-result-title");
  };

  const metricPlaceholders = () => <dl className="advanced-metrics">
    {[d.analysis.compactEnergy, d.analysis.compactCarbon, d.analysis.compactWater].map(label =>
      <div key={label}><dt>{label}</dt><dd>{c.undefinedValue}</dd></div>)}
  </dl>;

  const notice = <div className="advanced-notice">
    <p className="prototype-chip">{c.prototype}</p><p>{c.notice}</p>
  </div>;

  return <>
    <main className="landing-main advanced-main">
      {result ? <section aria-labelledby="advanced-result-title" className="advanced-stack">
        <h1 id="advanced-result-title" tabIndex={-1}>{c.resultTitle}</h1>
        {notice}
        <section className="composer advanced-stack" aria-labelledby="advanced-totals">
          <h2 id="advanced-totals">{c.totals}</h2>{metricPlaceholders()}
          <p className="input-hint">{c.assumptions}</p>
        </section>
        <section className="composer advanced-stack" aria-labelledby="advanced-summary">
          <h2 id="advanced-summary">{c.summary}</h2>
          <AdvancedParameterSummary details={details} copy={c} tokens={kind === "text"} />
          {kind === "text" && <p className="input-hint">{c.textOnlyNotice}</p>}
          {(kind === "text" || reference.trim()) && <details className="advanced-details">
            <summary>{kind === "text" ? c.finalText : c.reference}</summary>
            <p className="advanced-content">{kind === "text" ? text : reference}</p>
            {kind === "chat" && <p className="input-hint">{c.referenceHint}</p>}
          </details>}
        </section>
        {kind === "chat" && <section aria-labelledby="advanced-breakdown" className="advanced-stack">
          <h2 id="advanced-breakdown">{c.breakdown}</h2>
          {messages.filter(message => message.role === "assistant").map((message, index) =>
            <article className="composer advanced-stack" key={message.id}>
              <h3>{c.exchange.replace("{number}", String(index + 1))}</h3>
              {metricPlaceholders()}
              <AdvancedParameterSummary copy={c} details={{ ...message,
                model: message.model.trim() || details.model,
                reasoning: message.reasoning.trim() || details.reasoning }} />
              <details className="advanced-details"><summary>{c.content}</summary>
                <p className="advanced-content">{message.content}</p>
              </details>
            </article>)}
        </section>}
        <button className="secondary-action" type="button" onClick={() => {
          setResult(false); focus("advanced-title");
        }}>{c.edit}</button>
      </section> : <section aria-labelledby="advanced-title" className="advanced-stack">
        <h1 id="advanced-title" tabIndex={-1}>{c.title}</h1>
        {notice}
        <div className="composer advanced-stack">
          <fieldset className="advanced-kind">
            <legend className="sr-only">{c.inputType}</legend>
            {(["text", "chat"] as const).map(value => <label key={value}>
              <input type="radio" name="advanced-kind" value={value} checked={kind === value}
                onChange={() => { changed(); setKind(value); }} />
              {value === "text" ? c.finalText : c.chat}
            </label>)}
          </fieldset>
          {kind === "text" ? <div className="input-field">
            <label htmlFor="advanced-text">{c.textLabel}</label>
            <textarea id="advanced-text" autoComplete="off" spellCheck={false} value={text}
              aria-describedby="advanced-text-hint" onChange={event => { changed(); setText(event.currentTarget.value); }} />
            <p id="advanced-text-hint" className="input-hint">{c.textOnlyNotice}</p>
          </div> : <>
            {!reviewing ? <div className="input-field">
              <label htmlFor="advanced-chat">{c.chatLabel}</label>
              <textarea id="advanced-chat" autoComplete="off" spellCheck={false} value={paste}
                aria-describedby="advanced-chat-hint" onChange={event => { changed(); setPaste(event.currentTarget.value); }} />
              <p className="input-hint" id="advanced-chat-hint">{c.chatHint}</p>
              <button type="button" className="secondary-action" onClick={review}>{c.review}</button>
            </div> : <section aria-labelledby="advanced-review-title" className="advanced-stack">
              <h2 id="advanced-review-title" tabIndex={-1}>{c.reviewTitle}</h2>
              <button type="button" className="text-action" onClick={() => {
                changed(); setReviewing(false); focus("advanced-chat");
              }}>{c.replacePaste}</button>
              <p className="input-hint">{c.reviewHint}</p>
              <p className="input-hint" id="advanced-split-hint">{c.splitHint}</p>
              {messages.map((message, index) => <fieldset className="advanced-message advanced-stack" key={message.id}>
                <legend>{c.message.replace("{number}", String(index + 1))}</legend>
                <div className="input-field">
                  <label htmlFor={`message-${message.id}-role`}>{c.role}</label>
                  <select id={`message-${message.id}-role`} value={message.role}
                    onChange={event => update(message.id, {
                      ...emptyDetails(), role: event.currentTarget.value as MessageRole,
                    })}>
                    {(["unknown", "user", "assistant"] as const).map(role =>
                      <option key={role} value={role}>{c.roles[role]}</option>)}
                  </select>
                </div>
                <div className="input-field">
                  <label htmlFor={`message-${message.id}-content`}>{c.content}</label>
                  <textarea id={`message-${message.id}-content`} autoComplete="off" spellCheck={false}
                    ref={node => { if (node) textareas.current.set(message.id, node); else textareas.current.delete(message.id); }}
                    value={message.content} onChange={event => update(message.id, { content: event.currentTarget.value })} />
                </div>
                <div className="analysis-actions">
                  <button type="button" className="secondary-action" aria-describedby="advanced-split-hint"
                    onClick={() => split(message)}>{c.split}</button>
                  <button type="button" className="text-action" onClick={() => {
                    changed(); setMessages(current => current.filter(item => item.id !== message.id));
                    focus("advanced-add");
                  }}>{c.remove}</button>
                </div>
                {message.role === "assistant" && <>
                  <p className="input-hint">{c.overrideHint}</p>
                  <AdvancedDetails id={`message-${message.id}`} copy={c} details={message}
                    onChange={value => update(message.id, value)} />
                </>}
              </fieldset>)}
              <button id="advanced-add" type="button" className="secondary-action" onClick={add}>{c.add}</button>
            </section>}
            <div className="input-field">
              <label htmlFor="advanced-reference">{c.reference}</label>
              <textarea id="advanced-reference" autoComplete="off" spellCheck={false} value={reference}
                aria-describedby="advanced-reference-hint"
                onChange={event => { changed(); setReference(event.currentTarget.value); }} />
              <p className="input-hint" id="advanced-reference-hint">{c.referenceHint}</p>
            </div>
          </>}
        </div>
        <section className="composer advanced-stack" aria-labelledby="advanced-parameters-title">
          <h2 id="advanced-parameters-title">{c.summary}</h2>
          <p className="input-hint">{c.modelHint}</p>
          <AdvancedDetails id="advanced-general" details={details} copy={c} tokens={kind === "text"}
            onChange={value => { changed(); setDetails(value); }} />
        </section>
        {kind === "chat" && reviewing && <label className="confirmation-control">
          <input type="checkbox" checked={confirmed} disabled={!conversationValid}
            onChange={event => { setConfirmed(event.currentTarget.checked); setError(null); }} />{c.confirm}
        </label>}
        {error && <p role="alert" id="advanced-error" tabIndex={-1}>{error}</p>}
        <div className="analysis-actions">
          <button className="primary-action" type="button"
            disabled={kind === "chat" && (!reviewing || !confirmed)} onClick={showPreview}>{c.preview}</button>
          <button type="button" className="text-action" onClick={() => {
            changed(); setText(""); setPaste(""); setReference(""); setMessages([]);
            setDetails(emptyDetails()); setReviewing(false); focus("advanced-title");
          }}>{c.reset}</button>
        </div>
      </section>}
    </main>
    <footer className="site-footer advanced-footer"><p>{c.privacy}</p></footer>
  </>;
}
