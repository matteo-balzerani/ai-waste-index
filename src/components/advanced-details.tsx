import type { TechnicalDetails } from "@/browser/advanced/conversation";
import { validTokenCount } from "@/browser/advanced/conversation";
import type { Dictionary } from "@/i18n/types";

type Copy = Dictionary["advanced"];

export function AdvancedDetails({ id, details, copy, onChange, tokens = true }: {
  id: string;
  details: TechnicalDetails;
  copy: Copy;
  onChange: (details: TechnicalDetails) => void;
  tokens?: boolean;
}) {
  const field = (key: keyof TechnicalDetails) => {
    const token = key === "inputTokens" || key === "outputTokens";
    const invalid = token ? !validTokenCount(details[key]) : details[key].length > 200;
    return <div className="input-field" key={key}>
      <label htmlFor={`${id}-${key}`}>{copy[key]}</label>
      <input id={`${id}-${key}`} type="text" inputMode={token ? "numeric" : "text"}
        autoComplete="off" spellCheck={false} value={details[key]}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-${key}-error` : undefined}
        placeholder={copy.unknown}
        onChange={event => onChange({ ...details, [key]: event.currentTarget.value })} />
      {invalid && <p className="input-hint" id={`${id}-${key}-error`}>
        {token ? copy.tokenError : copy.detailsError}
      </p>}
    </div>;
  };
  return <div className="advanced-parameters">
    {field("model")}
    <details className="advanced-details">
      <summary>{copy.details}</summary>
      <div className="advanced-stack">
        {field("reasoning")}
        {tokens && <>
          <p className="input-hint">{copy.tokenHint}</p>
          <div className="advanced-grid">{field("inputTokens")}{field("outputTokens")}</div>
        </>}
      </div>
    </details>
  </div>;
}

export function AdvancedParameterSummary({ details, copy, tokens = true }: {
  details: TechnicalDetails; copy: Copy; tokens?: boolean;
}) {
  const keys: Array<keyof TechnicalDetails> = tokens
    ? ["model", "reasoning", "inputTokens", "outputTokens"] : ["model", "reasoning"];
  return <dl className="advanced-summary">
    {keys.map(key => <div key={key}>
      <dt>{copy[key]}</dt><dd>{details[key].trim() || copy.unknown}</dd>
    </div>)}
  </dl>;
}
