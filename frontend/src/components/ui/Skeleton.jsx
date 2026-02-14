import PropTypes from "prop-types";
import { cn } from "../../lib/utils";

/**
 * Skeleton loading placeholder — shimmer effect for content loading states.
 *
 * @example
 * <Skeleton className="h-4 w-32" />
 * <Skeleton className="h-10 w-10 rounded-full" />
 */
function Skeleton({ className, ...props }) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-muted", className)}
            {...props}
        />
    );
}

Skeleton.propTypes = {
    className: PropTypes.string,
};

/**
 * Pre-built skeleton for a table with rows.
 */
function TableSkeleton({ rows = 5, cols = 4, className }) {
    return (
        <div
            className={cn(
                "rounded-lg border border-border bg-white overflow-hidden",
                className,
            )}
        >
            {/* Header */}
            <div className="flex gap-4 border-b border-border bg-muted/30 px-4 py-3">
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} className="h-3.5 flex-1 max-w-[120px]" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <div
                    key={rowIdx}
                    className="flex gap-4 border-b border-border last:border-0 px-4 py-3.5"
                >
                    {Array.from({ length: cols }).map((_, colIdx) => (
                        <Skeleton
                            key={colIdx}
                            className={cn(
                                "h-3.5 flex-1",
                                colIdx === 0
                                    ? "max-w-[160px]"
                                    : "max-w-[100px]",
                            )}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

TableSkeleton.propTypes = {
    rows: PropTypes.number,
    cols: PropTypes.number,
    className: PropTypes.string,
};

/**
 * Pre-built skeleton for a detail page.
 */
function DetailSkeleton({ className }) {
    return (
        <div className={cn("space-y-6", className)}>
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
            {/* Info grid */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-lg border border-border p-4 space-y-2"
                    >
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-5 w-24" />
                    </div>
                ))}
            </div>
            {/* Content block */}
            <div className="rounded-lg border border-border p-5 space-y-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-full max-w-xl" />
                <Skeleton className="h-3 w-full max-w-lg" />
                <Skeleton className="h-3 w-full max-w-md" />
            </div>
        </div>
    );
}

DetailSkeleton.propTypes = {
    className: PropTypes.string,
};

/**
 * Pre-built skeleton for card grid (dashboard style).
 */
function CardGridSkeleton({ count = 4, className }) {
    return (
        <div className={cn("grid gap-4 grid-cols-2 lg:grid-cols-4", className)}>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="rounded-lg border border-border p-5 space-y-2"
                >
                    <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-7 w-14" />
                            <Skeleton className="h-3 w-28" />
                        </div>
                        <Skeleton className="h-10 w-10 rounded-xl" />
                    </div>
                </div>
            ))}
        </div>
    );
}

CardGridSkeleton.propTypes = {
    count: PropTypes.number,
    className: PropTypes.string,
};

export { Skeleton, TableSkeleton, DetailSkeleton, CardGridSkeleton };
