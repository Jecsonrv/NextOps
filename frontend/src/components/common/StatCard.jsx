import PropTypes from "prop-types";

/**
 * Stat card — Wider layout: Text Left | Icon Right (Centered)
 */
export function StatCard({ label, value, subtitle, icon: Icon }) {
    return (
        <div className="rounded-xl border border-border bg-card shadow-sm px-6 py-5 w-full min-w-[280px] flex items-center justify-between transition-shadow hover:shadow-md">
            <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-muted-foreground leading-tight">
                    {label}
                </p>
                <p className="text-2xl font-bold leading-tight text-foreground">
                    {value}
                </p>
                {subtitle && (
                    <p className="text-xs text-muted-foreground leading-tight">
                        {subtitle}
                    </p>
                )}
            </div>
            <Icon className="h-12 w-12 text-muted-foreground/50 shrink-0 ml-4" />
        </div>
    );
}

StatCard.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.node.isRequired,
    subtitle: PropTypes.string,
    icon: PropTypes.elementType.isRequired,
};
