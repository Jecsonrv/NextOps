import * as React from "react";
import PropTypes from "prop-types";
import { cn } from "../../lib/utils";

/**
 * Input profesional para ERP
 * Diseño limpio con bordes sutiles
 */
const Input = React.forwardRef(({ className, type, size = "md", ...props }, ref) => {
    const sizeClasses = {
        sm: "h-8 px-2 text-xs",
        md: "h-9 px-3 text-sm",
        lg: "h-10 px-4 text-sm",
    };

    return (
        <input
            type={type}
            className={cn(
                "flex w-full rounded border border-slate-300 bg-white text-slate-900",
                "placeholder:text-slate-400",
                "focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400",
                "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
                "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                sizeClasses[size] || sizeClasses.md,
                className
            )}
            ref={ref}
            {...props}
        />
    );
});
Input.displayName = "Input";

Input.propTypes = {
    className: PropTypes.string,
    type: PropTypes.string,
    size: PropTypes.oneOf(["sm", "md", "lg"]),
};

Input.defaultProps = {
    className: "",
    type: "text",
    size: "md",
};

export { Input };
