import { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { X } from "lucide-react";

/**
 * SlideOver - Panel lateral deslizante para detalles
 * Ideal para ver información sin cambiar de página
 * Implementación sin dependencias adicionales
 */
export function SlideOver({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    size = "md",
    showClose = true,
    footer,
}) {
    const panelRef = useRef(null);

    const sizeClasses = {
        sm: "max-w-md",
        md: "max-w-lg",
        lg: "max-w-2xl",
        xl: "max-w-4xl",
        full: "max-w-full",
    };

    // Manejar tecla Escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    // Bloquear scroll del body cuando está abierto
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Panel container */}
            <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
                <div
                    ref={panelRef}
                    className={`w-screen ${sizeClasses[size]} transform transition-transform duration-300 ease-out animate-in slide-in-from-right`}
                >
                    <div className="flex h-full flex-col bg-white shadow-xl">
                        {/* Header */}
                        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
                            <div className="flex-1 min-w-0">
                                {title && (
                                    <h2 className="text-base font-semibold text-slate-900 truncate">
                                        {title}
                                    </h2>
                                )}
                                {subtitle && (
                                    <p className="mt-1 text-sm text-slate-500 truncate">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                            {showClose && (
                                <div className="ml-3 flex h-7 items-center">
                                    <button
                                        type="button"
                                        className="rounded bg-white text-slate-400 hover:text-slate-500 hover:bg-slate-100 p-1.5 transition-colors"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Cerrar panel</span>
                                        <X className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="relative flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                            {children}
                        </div>

                        {/* Footer */}
                        {footer && (
                            <div className="flex-shrink-0 border-t border-slate-200 px-4 py-3 sm:px-6 bg-slate-50">
                                {footer}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

SlideOver.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.node,
    subtitle: PropTypes.node,
    children: PropTypes.node,
    size: PropTypes.oneOf(["sm", "md", "lg", "xl", "full"]),
    showClose: PropTypes.bool,
    footer: PropTypes.node,
};

export default SlideOver;
