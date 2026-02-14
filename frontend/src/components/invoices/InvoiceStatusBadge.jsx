import PropTypes from "prop-types";

/**
 * Badge visual para mostrar el estado de provisión de una factura.
 * Incluye colores, iconos y tooltips descriptivos.
 */
const InvoiceStatusBadge = ({ invoice }) => {
    const getStatusConfig = (estado) => {
        const configs = {
            pendiente: {
                label: "PENDIENTE",
                icon: "⏳",
                tooltip: "Factura pendiente de revisión",
                classes: "bg-amber-50 text-amber-800 border-amber-300",
            },
            revision: {
                label: "REVISIÓN",
                icon: "👁️",
                tooltip: "Factura en proceso de validación operativa",
                classes: "bg-primary/10 text-blue-800 border-blue-300",
            },
            disputada: {
                label: "DISPUTADA",
                icon: "⚠️",
                tooltip:
                    "Factura con disputa activa. No se provisionará hasta resolver.",
                classes: "bg-amber-50 text-amber-800 border-amber-300",
            },
            provisionada: {
                label: "PROVISIONADA",
                icon: "✓",
                tooltip: "Factura aprobada y lista para contabilidad",
                classes: "bg-emerald-50 text-emerald-800 border-emerald-300",
            },
            anulada: {
                label: "ANULADA",
                icon: "✕",
                tooltip: "Factura anulada completamente. No se pagará.",
                classes: "bg-destructive/10 text-red-800 border-red-300",
            },
            anulada_parcialmente: {
                label: "ANULADA PARCIAL",
                icon: "◐",
                tooltip: "Factura con ajuste parcial. Monto modificado.",
                classes: "bg-orange-50 text-orange-800 border-orange-300",
            },
            rechazada: {
                label: "RECHAZADA",
                icon: "✕",
                tooltip: "Factura rechazada. No procede.",
                classes: "bg-destructive/10 text-red-800 border-red-300",
            },
        };

        return configs[estado] || configs.pendiente;
    };

    const config = getStatusConfig(invoice.estado_provision);

    return (
        <div className="relative group inline-flex">
            <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${config.classes}`}
            >
                <span className="text-sm leading-none">{config.icon}</span>
                <span>{config.label}</span>
            </div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {config.tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800" />
            </div>
        </div>
    );
};

InvoiceStatusBadge.propTypes = {
    invoice: PropTypes.object.isRequired,
};

/**
 * Badge para mostrar el resultado de una disputa.
 */
export const DisputeResultBadge = ({ resultado }) => {
    const configs = {
        pendiente: {
            label: "PENDIENTE",
            classes: "border-slate-300 text-slate-600",
            tooltip: "Sin resolver",
        },
        aprobada_total: {
            label: "APROBADA 100%",
            classes: "border-emerald-400 text-emerald-700",
            tooltip: "Aprobada totalmente",
        },
        aprobada_parcial: {
            label: "APROBADA PARCIAL",
            classes: "border-sky-400 text-sky-700",
            tooltip: "Aprobada parcialmente",
        },
        rechazada: {
            label: "RECHAZADA",
            classes: "border-red-400 text-red-700",
            tooltip: "Rechazada por proveedor",
        },
        anulada: {
            label: "ANULADA",
            classes: "border-amber-400 text-amber-700",
            tooltip: "Anulada internamente",
        },
    };

    const config = configs[resultado] || configs.pendiente;

    return (
        <div className="relative group inline-flex">
            <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.classes}`}
            >
                {config.label}
            </span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {config.tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800" />
            </div>
        </div>
    );
};

DisputeResultBadge.propTypes = {
    resultado: PropTypes.string,
};

/**
 * Indicador de tipo de costo (vinculado vs auxiliar).
 */
export const CostTypeBadge = () => {
    return null;
};

/**
 * Indicador de exclusión de estadísticas.
 */
export const ExcludedFromStatsBadge = ({ invoice }) => {
    if (!invoice.debe_excluirse_estadisticas) {
        return null;
    }

    return (
        <div className="relative group inline-flex">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold text-slate-500 bg-slate-100 opacity-60">
                !
            </span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Excluida de estadísticas
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800" />
            </div>
        </div>
    );
};

ExcludedFromStatsBadge.propTypes = {
    invoice: PropTypes.object.isRequired,
};

export default InvoiceStatusBadge;
