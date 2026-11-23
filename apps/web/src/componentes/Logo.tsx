/** Marca: un sol de atardecer partido por la estela de un avión. */
export function Logo() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="logo-cielo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8a4c" />
          <stop offset=".55" stopColor="#e8486b" />
          <stop offset="1" stopColor="#5b2a6e" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#logo-cielo)" />
      <circle cx="24" cy="29" r="10" fill="#ffd9a8" />
      <path d="M6 33h36" stroke="#5b2a6e" strokeWidth="3" strokeLinecap="round" />
      <path d="M9 19c8-6 18-7 30-3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 4" fill="none" />
      <path d="m37 12 4 3.6-5 1.4" fill="#fff" />
    </svg>
  );
}
