import * as React from "react";
import PropTypes from "prop-types";
import { cn } from "../../lib/utils";

/**
 * Badges profesionales para ERP
 * Diseño minimalista con colores apagados y sutiles
 */
const badgeVariants = {
    // Default: gris neutro profesional
    default: "bg-slate-100 text-slate-700 border-slate-200",
    // Secondary: más sutil
    secondary: "bg-slate-50 text-slate-600 border-slate-200",
    // Destructive: rojo apagado para errores/alertas
    destructive: "bg-red-50 text-red-700 border-red-200",
    // Outline: solo borde
    outline: "border-slate-300 text-slate-600 bg-transparent",
    // Success: verde sobrio
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    // Warning: ámbar apagado
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    // Info: azul grisáceo
    info: "bg-slate-100 text-slate-600 border-slate-200",
    // Blue: para compatibilidad
    blue: "bg-slate-100 text-slate-700 border-slate-200",
    // Nuevas variantes para estados ERP
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    provisioned: "bg-emerald-50 text-emerald-700 border-emerald-200",
    paid: "bg-slate-700 text-white border-slate-700",
    disputed: "bg-orange-50 text-orange-700 border-orange-200",
    cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

const Badge = React.forwardRef(
    ({ className, variant = "default", size = "sm", ...props }, ref) => {
        const sizeClasses = {
            xs: "px-1.5 py-0.5 text-[10px]",
            sm: "px-2 py-0.5 text-xs",
            md: "px-2.5 py-1 text-sm",
        };

        return (
            <span
                ref={ref}
                className={cn(
                    "inline-flex items-center rounded border font-medium transition-colors",
                    sizeClasses[size] || sizeClasses.sm,
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
        "pending",
        "provisioned",
        "paid",
        "disputed",
        "cancelled",
    ]),
    size: PropTypes.oneOf(["xs", "sm", "md"]),
    children: PropTypes.node,
};

Badge.defaultProps = {
    className: "",
    variant: "default",
    size: "sm",
    children: null,
};

export { Badge };
