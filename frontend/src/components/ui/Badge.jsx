import * as React from "react";
import PropTypes from "prop-types";
import { cn } from "../../lib/utils";

const badgeVariants = {
    default:
        "bg-secondary text-secondary-foreground border-border hover:bg-muted",
    secondary: "bg-muted text-foreground border-border hover:bg-muted",
    destructive:
        "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/15",
    outline: "border-border text-foreground hover:bg-muted/60",
    success:
        "bg-emerald-100/60 text-emerald-800 border-emerald-300/60 hover:bg-emerald-100",
    warning:
        "bg-amber-100/60 text-amber-800 border-amber-300/60 hover:bg-amber-100",
    info: "bg-accent text-accent-foreground border-border hover:bg-accent/90",
    blue: "bg-accent text-accent-foreground border-border hover:bg-accent/90",
};

const Badge = React.forwardRef(
    ({ className, variant = "default", ...props }, ref) => {
        return (
            <span
                ref={ref}
                className={cn(
                    "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    badgeVariants[variant] || badgeVariants.default,
                    className,
                )}
                {...props}
            />
        );
    },
);
Badge.displayName = "Badge";

Badge.propTypes = {
    className: PropTypes.string,
    variant: PropTypes.oneOf([
        "default",
        "secondary",
        "destructive",
        "outline",
        "success",
        "warning",
        "info",
        "blue",
    ]),
    children: PropTypes.node,
};

Badge.defaultProps = {
    className: "",
    variant: "default",
    children: null,
};

export { Badge };
