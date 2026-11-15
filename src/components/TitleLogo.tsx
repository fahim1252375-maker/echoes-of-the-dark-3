export function TitleLogo() {
  return (
    <div className="flex flex-col items-center select-none">
      <svg
        viewBox="0 0 640 160"
        className="w-full max-w-[540px] h-auto"
        role="img"
        aria-label="Echoes of the Dark"
      >
        <defs>
          <linearGradient id="echo3dTitleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F1F5FF" />
            <stop offset="50%" stopColor="#43E8FF" />
            <stop offset="100%" stopColor="#9B7BFF" />
          </linearGradient>
        </defs>

        <g transform="translate(320, 42)">
          <circle cx="0" cy="0" r="30" fill="none" stroke="#3986FF" strokeWidth="1.2" opacity="0.45" />
          <circle cx="0" cy="0" r="20" fill="none" stroke="#43E8FF" strokeWidth="1.5" opacity="0.75" />
          <circle cx="0" cy="0" r="10" fill="none" stroke="#9B7BFF" strokeWidth="1.5" opacity="0.9" />
          <circle cx="0" cy="0" r="4" fill="#43E8FF" />
          <line x1="-120" y1="0" x2="-40" y2="0" stroke="#3986FF" strokeWidth="1" opacity="0.4" />
          <line x1="40" y1="0" x2="120" y2="0" stroke="#3986FF" strokeWidth="1" opacity="0.4" />
        </g>

        <text
          x="320"
          y="110"
          textAnchor="middle"
          fill="url(#echo3dTitleGrad)"
          className="font-display"
          fontSize="48"
          fontWeight="700"
          letterSpacing="6"
        >
          ECHOES OF THE DARK
        </text>

        <text
          x="320"
          y="142"
          textAnchor="middle"
          fill="#A4B0C6"
          className="font-sans"
          fontSize="13"
          fontWeight="500"
          letterSpacing="3.5"
        >
          EVERY ECHO REVEALS A FORGOTTEN WORLD
        </text>
      </svg>
    </div>
  );
}
