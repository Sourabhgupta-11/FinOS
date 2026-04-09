import React from "react";

export default function FuturisticLoader({ size = 64, label = "" }) {
  const s = size;
  const mid = s / 2;
  const outerR = (s - 6) / 2;
  const innerR = outerR * 0.62;
  const coreR = outerR * 0.22;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div style={{ width: s, height: s, position: "relative" }}>
        {/* ── outer ring ─────────────────────────────────────────────── */}
        <svg
          width={s}
          height={s}
          viewBox={`0 0 ${s} ${s}`}
          style={{
            position: "absolute",
            inset: 0,
            animation: "flos-spin-cw 1.4s linear infinite",
          }}
        >
          <defs>
            <linearGradient id="flos-g1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
              <stop offset="60%" stopColor="#3b82f6" stopOpacity="1" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="1" />
            </linearGradient>
          </defs>
          <circle
            cx={mid}
            cy={mid}
            r={outerR}
            fill="none"
            stroke="url(#flos-g1)"
            strokeWidth="3"
            strokeDasharray={`${Math.PI * outerR * 1.5} ${Math.PI * outerR * 0.5}`}
            strokeLinecap="round"
          />
        </svg>

        {/* ── inner ring (counter-clockwise, different speed) ─────────── */}
        <svg
          width={s}
          height={s}
          viewBox={`0 0 ${s} ${s}`}
          style={{
            position: "absolute",
            inset: 0,
            animation: "flos-spin-ccw 1s linear infinite",
          }}
        >
          <defs>
            <linearGradient id="flos-g2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="1" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
            </linearGradient>
          </defs>
          <circle
            cx={mid}
            cy={mid}
            r={innerR}
            fill="none"
            stroke="url(#flos-g2)"
            strokeWidth="2.5"
            strokeDasharray={`${Math.PI * innerR * 1.2} ${Math.PI * innerR * 0.8}`}
            strokeLinecap="round"
          />
        </svg>

        {/* ── glowing core dot ─────────────────────────────────────────── */}
        <svg
          width={s}
          height={s}
          viewBox={`0 0 ${s} ${s}`}
          style={{ position: "absolute", inset: 0 }}
        >
          <defs>
            <radialGradient id="flos-core">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="1" />
              <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle
            cx={mid}
            cy={mid}
            r={coreR * 1.8}
            fill="url(#flos-core)"
            style={{ animation: "flos-pulse 1.6s ease-in-out infinite" }}
          />
          <circle
            cx={mid}
            cy={mid}
            r={coreR * 0.55}
            fill="#eff6ff"
            style={{ animation: "flos-pulse 1.6s ease-in-out infinite" }}
          />
        </svg>

        {/* ── tick marks around outer ring ─────────────────────────────── */}
        <svg
          width={s}
          height={s}
          viewBox={`0 0 ${s} ${s}`}
          style={{ position: "absolute", inset: 0, opacity: 0.25 }}
        >
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const x1 = mid + (outerR - 4) * Math.cos(angle);
            const y1 = mid + (outerR - 4) * Math.sin(angle);
            const x2 = mid + (outerR + 1) * Math.cos(angle);
            const y2 = mid + (outerR + 1) * Math.sin(angle);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#60a5fa"
                strokeWidth={i % 3 === 0 ? 2 : 1}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      </div>

      {label && (
        <span
          className="text-xs font-medium tracking-widest uppercase"
          style={{
            color: "#60a5fa",
            animation: "flos-fade 1.6s ease-in-out infinite",
          }}
        >
          {label}
        </span>
      )}

      {/* Keyframes injected once */}
      <style>{`
        @keyframes flos-spin-cw  { to { transform: rotate(360deg); } }
        @keyframes flos-spin-ccw { to { transform: rotate(-360deg); } }
        @keyframes flos-pulse {
          0%, 100% { opacity: 0.7; transform: scale(0.9); }
          50%       { opacity: 1;   transform: scale(1.15); }
        }
        @keyframes flos-fade {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/**
 * Full-screen loading overlay — used by ProtectedRoute and page transitions.
 */
export function FullScreenLoader({ label = "Loading FinOS…" }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <FuturisticLoader size={72} label={label} />
    </div>
  );
}