import * as React from "react";
import PropTypes from "prop-types";
import { cn } from "../../lib/utils";

const badgeVariants = {
    default: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    secondary: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
    destructive: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    outline: "border-gray-300 text-gray-700 hover:bg-gray-50",
    success: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
    warning: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
    info: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    blue: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
};

const Badge = React.forwardRef(
    ({ className, variant = "default", ...props }, ref) => {
        return (
            <span
                ref={ref}
                className={cn(
                    "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
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
