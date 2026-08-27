// Earthline Intelligence: truthful states are product surfaces, never filler content.
import { AlertTriangle, LoaderCircle, Sprout } from "lucide-react";

type StatePanelProps = {
  kind: "loading" | "empty" | "error";
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function StatePanel({ kind, title, message, actionLabel, onAction }: StatePanelProps) {
  const Icon = kind === "loading" ? LoaderCircle : kind === "error" ? AlertTriangle : Sprout;
  return (
    <div className={`state-panel state-panel--${kind}`} role={kind === "error" ? "alert" : "status"}>
      <span className="state-panel__icon" aria-hidden="true">
        <Icon className={kind === "loading" ? "spin" : ""} size={24} strokeWidth={1.8} />
      </span>
      <div>
        <h3>{title}</h3>
        <p>{message}</p>
        {actionLabel && onAction ? (
          <button className="text-button" type="button" onClick={onAction}>{actionLabel}</button>
        ) : null}
      </div>
    </div>
  );
}
