export function BrandLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm">
      <div className="relative flex flex-col items-center gap-5">
        {/* Outer ring */}
        <div className="relative w-16 h-16">
          <svg
            className="absolute inset-0 animate-spin-slow"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="32" cy="32" r="28" stroke="#EDE9FE" strokeWidth="3" />
            <path
              d="M32 4 A28 28 0 0 1 60 32"
              stroke="#7C3AED"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          {/* Inner LP logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="animate-pulse-subtle"
            >
              <rect width="28" height="28" rx="6" fill="#7C3AED" />
              <text
                x="14"
                y="19"
                textAnchor="middle"
                fill="white"
                fontSize="14"
                fontWeight="700"
                fontFamily="system-ui, sans-serif"
              >
                LP
              </text>
            </svg>
          </div>
        </div>
        {/* Tagline */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-semibold text-[#7C3AED] tracking-wide">LeadPilot AI</p>
          <p className="text-[10px] text-[#9CA3AF] font-medium tracking-wider uppercase">Loading...</p>
        </div>
      </div>
    </div>
  );
}
