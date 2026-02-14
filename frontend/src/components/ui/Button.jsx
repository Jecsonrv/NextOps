import React from "react";
import PropTypes from "prop-types";

const Button = React.forwardRef(
    (
        {
            children,
            variant = "primary",
            size = "md",
            type = "button",
            disabled = false,
            loading = false,
            className = "",
            icon,
            onClick,
            ...props
        },
        ref,
    ) => {
        const baseStyles =
            "inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

        const variants = {
            primary:
                "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring",
            secondary:
                "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-ring",
            success:
                "bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:ring-ring",
            danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-ring",
            outline:
                "border border-border bg-background text-foreground hover:bg-muted focus-visible:ring-ring active:bg-muted/80",
            ghost: "text-foreground hover:bg-muted focus-visible:ring-ring",
        };

        const sizes = {
            sm: "px-3 py-1.5 text-sm",
            md: "px-4 py-2 text-sm",
            lg: "px-6 py-3 text-base",
        };

        return (
            <button
                type={type}
                disabled={disabled || loading}
                onClick={onClick}
                ref={ref}
                className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
                {...props}
            >
                {loading && (
                    <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                )}
                {icon && !loading && <span className="mr-2">{icon}</span>}
                {children}
            </button>
        );
    },
);

Button.displayName = "Button";

Button.propTypes = {
    children: PropTypes.node.isRequired,
    variant: PropTypes.oneOf([
        "primary",
        "secondary",
        "success",
        "danger",
        "outline",
        "ghost",
    ]),
    size: PropTypes.oneOf(["sm", "md", "lg"]),
    type: PropTypes.oneOf(["button", "submit", "reset"]),
    disabled: PropTypes.bool,
    loading: PropTypes.bool,
    className: PropTypes.string,
    icon: PropTypes.node,
    onClick: PropTypes.func,
};

export { Button };
export default Button;
