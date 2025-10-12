/**
 * Modal profesional para renombrar clientes
 * Reemplaza los prompts básicos con una interfaz moderna
 */

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { X, AlertCircle, FileText, Edit3 } from "lucide-react";
import { Button } from "./ui/Button";

function ModalPortal({ children }) {
    const [mounted, setMounted] = useState(false);
    const [container] = useState(() => {
        const node = document.createElement("div");
        node.className = "modal-portal-root";
        return node;
    });

    useEffect(() => {
        document.body.appendChild(container);
        setMounted(true);
        return () => {
            setMounted(false);
            document.body.removeChild(container);
        };
    }, [container]);

    if (!mounted) return null;

    return createPortal(children, container);
}

ModalPortal.propTypes = {
    children: PropTypes.node.isRequired,
};

export function RenameClientModal({
    isOpen,
    alias,
    onConfirm,
    onCancel,
    isLoading = false,
}) {
    const [newName, setNewName] = useState("");
    const [errors, setErrors] = useState({ newName: "" });

    useEffect(() => {
        if (isOpen && alias) {
            setNewName(alias.original_name || "");
            setErrors({ newName: "" });
        }
    }, [isOpen, alias]);

    const validate = () => {
        const newErrors = { newName: "" };
        let isValid = true;

        if (!newName.trim()) {
            newErrors.newName = "El nombre es requerido";
            isValid = false;
        } else if (newName.trim().toUpperCase() === alias?.original_name?.toUpperCase()) {
            newErrors.newName = "El nuevo nombre debe ser diferente al actual";
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleConfirm = () => {
        if (!validate()) return;

        onConfirm({
            newName: newName.trim(),
        });
    };

    const handleKeyDown = (e) => {
        if (e.key === "Escape" && !isLoading) {
            onCancel();
        }
    };

    if (!isOpen || !alias) return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isLoading) {
                    onCancel();
                }
            }}
            onKeyDown={handleKeyDown}
        >
            <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                            <Edit3 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-widest text-gray-400">
                                Renombrar Cliente
                            </p>
                            <h2 className="mt-1 text-xl font-semibold text-gray-900">
                                Actualizar nombre oficial
                            </h2>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {/* Información del cliente */}
                    <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
                        <div className="flex items-start gap-3 text-sm">
                            <FileText className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                            <div className="flex-1 space-y-1">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Nombre actual
                                </p>
                                <p className="font-semibold text-gray-900">
                                    {alias.original_name}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="rounded-full bg-white px-2 py-0.5">
                                        {alias.usage_count || 0} OTs
                                    </span>
                                    {alias.is_verified && (
                                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">
                                            Verificado
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Alerta informativa */}
                    <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                        <div className="space-y-1">
                            <p className="font-medium">
                                Este cambio actualizará todas las OTs
                            </p>
                            <p className="text-xs text-blue-700">
                                El nuevo nombre se aplicará automáticamente a las{" "}
                                <strong>{alias.usage_count || 0} OTs</strong> que
                                actualmente usan este cliente.
                            </p>
                        </div>
                    </div>

                    {/* Campo: Nuevo nombre */}
                    <div className="space-y-2">
                        <label
                            htmlFor="newName"
                            className="text-sm font-medium text-gray-700"
                        >
                            Nuevo nombre del cliente{" "}
                            <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="newName"
                            type="text"
                            value={newName}
                            onChange={(e) => {
                                setNewName(e.target.value);
                                if (errors.newName) setErrors({ ...errors, newName: "" });
                            }}
                            placeholder="Ej. INTRALOGIX, S.A. DE C.V."
                            className={`w-full rounded-xl border px-4 py-3 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 ${
                                errors.newName
                                    ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200"
                                    : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                            }`}
                            disabled={isLoading}
                            autoFocus
                        />
                        {errors.newName && (
                            <p className="flex items-center gap-1 text-xs text-red-600">
                                <AlertCircle className="h-3 w-3" />
                                {errors.newName}
                            </p>
                        )}
                        <p className="text-xs text-gray-500">
                            Usa el formato exacto que debe aparecer en todas tus OTs
                        </p>
                    </div>

                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                Renombrando...
                            </span>
                        ) : (
                            `Confirmar`
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );

    return <ModalPortal>{modalContent}</ModalPortal>;
}

RenameClientModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    alias: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        original_name: PropTypes.string,
        usage_count: PropTypes.number,
        is_verified: PropTypes.bool,
    }),
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    isLoading: PropTypes.bool,
};

RenameClientModal.defaultProps = {
    isLoading: false,
    alias: null,
};
