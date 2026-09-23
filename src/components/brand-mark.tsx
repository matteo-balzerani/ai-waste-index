/** The three strokes are a visual identity, never a score scale. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg className={`brand-mark ${className}`} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="46" height="46" rx="14" fill="currentColor" />
      <path d="M13 29V19M24 34V14M35 29V19" stroke="var(--lime, #d5fa46)" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
