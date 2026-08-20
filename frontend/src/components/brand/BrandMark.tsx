// Field Notes Intelligence reminder: the mark should feel like a crop lens—confident, simple, organic, and never overly futuristic.
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  showWordmark?: boolean;
  inverse?: boolean;
}

export function BrandMark({ className, showWordmark = true, inverse = false }: BrandMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className={cn("relative grid size-9 shrink-0 place-items-center rounded-[13px]", inverse ? "bg-white/12" : "bg-[#E8F4ED]")} aria-hidden="true">
        <svg viewBox="0 0 36 36" className="size-7" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.3 29.2C10.05 28.45 5.55 21.82 7.83 13.74C8.58 11.08 10.39 8.72 13.16 7.02C14.35 13.86 17.13 17.42 21.5 17.7C22.16 13.58 24.66 10.86 28.98 9.53C30.74 18.75 26.7 27.61 18.3 29.2Z" fill={inverse ? "#E8F4ED" : "#176B45"} />
          <path d="M9.37 25.27C14.13 21.78 18.64 18.58 27.07 13.08" stroke={inverse ? "#FFFFFF" : "#FFFFFF"} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M13.88 24.9C14.93 23.27 15.37 21.66 15.18 20.08" stroke={inverse ? "#FFFFFF" : "#FFFFFF"} strokeWidth="1.35" strokeLinecap="round" />
        </svg>
      </span>
      {showWordmark && (
        <span className={cn("text-[15px] font-extrabold tracking-[-0.03em]", inverse ? "text-white" : "text-[#0E4D35]")}>CropLens <span className={cn("font-semibold", inverse ? "text-[#B8D8C5]" : "text-[#176B45]")}>AI</span></span>
      )}
    </span>
  );
}
