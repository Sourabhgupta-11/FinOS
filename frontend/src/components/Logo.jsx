// FinOS Logo mark — self-contained SVG component
// size: number (default 32), variant: 'full' | 'icon'
export default function Logo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="FinOS"
    >
      <defs>
        <linearGradient id="logoBg" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1d4ed8"/>
          <stop offset="100%" stopColor="#4f46e5"/>
        </linearGradient>
      </defs>
      <rect width="200" height="200" rx="44" fill="url(#logoBg)"/>
      {/* top bar */}
      <rect x="62" y="56" width="76" height="11" rx="5.5" fill="white"/>
      {/* mid bar */}
      <rect x="62" y="77" width="76" height="11" rx="5.5" fill="white"/>
      {/* stem */}
      <rect x="62" y="56" width="12" height="88" rx="6" fill="white"/>
      {/* diagonal */}
      <line x1="72" y1="105" x2="126" y2="154" stroke="white" strokeWidth="12" strokeLinecap="round"/>
    </svg>
  );
}
