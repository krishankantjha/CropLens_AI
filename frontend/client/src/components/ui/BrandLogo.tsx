export function BrandLogo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo-icon.png"
      width={size}
      height={size}
      alt="CropLens AI"
      className={className}
      style={{ objectFit: "contain", display: "inline-block" }}
    />
  );
}

