/** Globe-and-signal mark echoing the PGM Technologies group brand. */
export function PgmMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="13" fill="#0b73da" fillOpacity="0.12" />
      <circle
        cx="16"
        cy="16"
        r="9"
        fill="none"
        stroke="#0b73da"
        strokeWidth="1.6"
      />
      <path
        d="M7 12c4-3 9-3.5 13-1"
        stroke="#0b73da"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M6 20c5 2.5 11 2.5 16 0"
        stroke="#0b73da"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M4 9c6-5 15-6.5 22-2.5"
        stroke="#7fc0f5"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
