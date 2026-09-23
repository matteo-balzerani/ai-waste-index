const paths = {
  text: "M4 5h16M12 5v14M8 19h8",
  link: "M9 8H7a4 4 0 0 0 0 8h2m6-8h2a4 4 0 0 1 0 8h-2M8 12h8",
  image: "M4 4h16v16H4ZM4 16l5-5 4 4 3-3 4 4M15 8h.01",
  energy: "m13 2-9 12h7l-1 8 10-12h-7z",
  carbon: "M7 18a4 4 0 0 1-1-8 6 6 0 0 1 12-1 4.5 4.5 0 0 1 0 9ZM9 21h6",
  water: "M12 3C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-12ZM9 15a3 3 0 0 0 3 3",
  refresh: "M4 10a8 8 0 1 1 1 8M4 4v6h6",
} as const;

/** Decorative local SVGs: every action retains its visible text label. */
export function UiIcon({ name, className = "" }: { name: keyof typeof paths; className?: string }) {
  return <svg className={`ui-icon ${className}`} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={paths[name]} />
  </svg>;
}
