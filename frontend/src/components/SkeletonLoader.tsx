/**
 * IndAI — Skeleton Loader Component
 * Animated placeholder for loading states.
 */

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({
  width = "100%",
  height = "20px",
  borderRadius = "var(--radius-sm)",
  className = "",
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius }}
    />
  );
}

/** Pre-built skeleton layout for the Dashboard page */
export function DashboardSkeleton() {
  return (
    <div className="dashboard-page" id="dashboard-page">
      {/* Stats Grid Skeleton */}
      <div className="stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <div className="stat-card" key={i}>
            <Skeleton width="60%" height="14px" />
            <Skeleton width="40%" height="36px" className="skeleton-mt" />
            <Skeleton width="80%" height="12px" className="skeleton-mt" />
          </div>
        ))}
      </div>

      {/* Section Title Skeleton */}
      <div style={{ marginTop: "var(--space-xl)" }}>
        <Skeleton width="200px" height="24px" />
      </div>

      {/* Scan List Skeleton */}
      <div className="scan-list" style={{ marginTop: "var(--space-md)" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div className="scan-card" key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <Skeleton width="45%" height="18px" />
                <Skeleton width="30%" height="14px" className="skeleton-mt" />
              </div>
              <Skeleton width="80px" height="28px" borderRadius="var(--radius-full)" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
