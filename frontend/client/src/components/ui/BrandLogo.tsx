export function BrandLogo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 38 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="19" cy="19" r="17" stroke="#1f5a3d" strokeWidth="2.5" strokeDasharray="4 2" strokeOpacity="0.45" />
      <circle cx="19" cy="19" r="13" fill="#e8f5e9" stroke="#1f5a3d" strokeWidth="2" />
      <path d="M13 25C13 17 19 13 25 13C25 21 19 25 13 25Z" fill="#1f5a3d" />
      <path d="M13 25L21 17" stroke="#ffffff" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="26" cy="12" r="3" fill="#f59e0b" />
    </svg>
  );
}
