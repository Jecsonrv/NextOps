import * as React from "react";
import PropTypes from "prop-types";
import { cn } from "../../lib/utils";

const badgeVariants = {
    default: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
    secondary: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200",
    destructive: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
    outline: "border-gray-300 text-gray-700 hover:bg-gray-100",
    success: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
    warning:
        "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
    info: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
};

const Badge = React.forwardRef(
    ({ className, variant = "default", ...props }, ref) => {
        return (
            <span
                ref={ref}
                className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    badgeVariants[variant] || badgeVariants.default,
                    className
                )}
                {...props}
            />
        );
    }
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
