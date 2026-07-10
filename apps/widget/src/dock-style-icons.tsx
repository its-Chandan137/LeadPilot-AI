export function BlastSparkleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="lp-blast-sparkle-grad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="0.5" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <path d="M12 3l1.2 4.2L17.5 8.5 13.2 9.7 12 14l-1.2-4.3L6.5 8.5l4.3-1.3L12 3z" fill="url(#lp-blast-sparkle-grad)" />
      <circle cx="18" cy="6" r="1.2" fill="url(#lp-blast-sparkle-grad)" />
      <circle cx="7" cy="17" r="1" fill="url(#lp-blast-sparkle-grad)" />
    </svg>
  );
}

export function BlastSparkleLauncherIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2.5l1.4 4.8L18 8.9l-4.6 1.4L12 15l-1.4-4.7L6 8.9l4.6-1.6L12 2.5z" fill="white" />
      <circle cx="18.5" cy="5.5" r="1.3" fill="white" />
      <circle cx="7" cy="17.5" r="1" fill="white" />
    </svg>
  );
}

export function BlastSendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 11.5L21 3l-8.5 18-2.2-7.3L3 11.5z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function BlastPhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.5 4h3l1.5 4.5-2 1.2a12 12 0 0 0 5.3 5.3l1.2-2L21.5 14v3a1.5 1.5 0 0 1-1.6 1.5C10.2 18.5 5.5 13.8 5 7.1A1.5 1.5 0 0 1 6.5 4z"
        fill="white"
      />
    </svg>
  );
}

export function BlastHeadsetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 14a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2h-1v-5a7 7 0 0 0-14 0v5H4a2 2 0 0 1-2-2v-4z"
        stroke="#475569"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BlastCalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="#475569" strokeWidth="1.75" />
      <path d="M8 3v4M16 3v4M4 10h16" stroke="#475569" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function BlastChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
