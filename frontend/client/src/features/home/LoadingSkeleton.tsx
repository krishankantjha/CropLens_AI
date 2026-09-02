type LoadingSkeletonProps = {
  label: string;
  variant?: "default" | "decision" | "chart";
};

export function LoadingSkeleton({ label, variant = "default" }: LoadingSkeletonProps) {
  return (
    <div className={`loading-skeleton loading-skeleton--${variant}`} role="status" aria-label={label}>
      {variant === "decision" ? (
        <>
          <span className="skeleton-line skeleton-line--badge" />
          <span className="skeleton-line skeleton-line--wide" />
          <div className="skeleton-decision-grid">
            <span className="skeleton-line skeleton-line--tall" />
            <span className="skeleton-line skeleton-line--tall" />
          </div>
          <span className="skeleton-line skeleton-line--corridor" />
        </>
      ) : variant === "chart" ? (
        <>
          <span className="skeleton-line skeleton-line--short" />
          <span className="skeleton-line skeleton-line--chart" />
        </>
      ) : (
        <>
          <span className="skeleton-line skeleton-line--wide" />
          <span className="skeleton-line" />
          <span className="skeleton-line skeleton-line--short" />
        </>
      )}
    </div>
  );
}
