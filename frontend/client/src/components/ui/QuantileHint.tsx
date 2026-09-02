import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type QuantileHintProps = {
  label: string;
  hint: string;
  children?: ReactNode;
};

export function QuantileHint({ label, hint, children }: QuantileHintProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="quantile-hint" aria-label={hint}>
          {children ?? (
            <>
              <span>{label}</span>
              <HelpCircle size={13} aria-hidden="true" />
            </>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{hint}</TooltipContent>
    </Tooltip>
  );
}
