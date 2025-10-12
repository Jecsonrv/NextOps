/**
 * Modal para confirmar normalización masiva de aliases
 * Muestra el impacto (OTs afectadas) y permite agregar notas
 */

import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
    X,
    FileText,
    ArrowRight,
    Loader2,
    Target,
    PenLine,
} from "lucide-react";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { useCountAliasOTs } from "../hooks/useCatalogs";

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

export function NormalizationModal({
    sourceAlias,
    targetAlias,
    similarityScore,
    onConfirm,
    onCancel,
    isLoading = false,
}) {
    const [notes, setNotes] = useState("");
    const [selectedTargetId, setSelectedTargetId] = useState(
        targetAlias?.id ?? sourceAlias?.id ?? null
    );

    const { keepAlias, removeAlias } = useMemo(() => {
        if (!sourceAlias || !targetAlias) {
            return { keepAlias: null, removeAlias: null };
        }

        const currentTargetId =
            selectedTargetId ?? targetAlias.id ?? sourceAlias.id;

        const resolvedKeep =
            currentTargetId === targetAlias.id ? targetAlias : sourceAlias;
        const resolvedRemove =
            resolvedKeep.id === targetAlias.id ? sourceAlias : targetAlias;

        return { keepAlias: resolvedKeep, removeAlias: resolvedRemove };
    }, [sourceAlias, targetAlias, selectedTargetId]);

    const { data: removeAliasCount, isLoading: loadingCount } =
        useCountAliasOTs(removeAlias?.id, {
            keepPreviousData: true,
            enabled: Boolean(removeAlias?.id),
        });

    const otsCount = useMemo(() => {
        if (typeof removeAliasCount === "number") return removeAliasCount;
        return removeAliasCount?.count ?? removeAlias?.usage_count ?? 0;
    }, [removeAliasCount, removeAlias?.usage_count]);

    const [finalName, setFinalName] = useState(keepAlias?.original_name || "");

    useEffect(() => {
        if (keepAlias) {
            setFinalName(keepAlias.original_name || "");
        }
    }, [keepAlias]);

    const isConfirmDisabled =
        !notes.trim() || !finalName.trim() || isLoading || loadingCount;

    const handleConfirm = () => {
        if (!onConfirm || !keepAlias || !removeAlias) return;

        const trimmedFinalName = finalName.trim();
        const payload = {
            notes: notes.trim(),
            sourceAliasId: removeAlias.id,
            targetAliasId: keepAlias.id,
            customTargetName:
                trimmedFinalName &&
                trimmedFinalName !== (keepAlias.original_name || "")
                    ? trimmedFinalName
                    : null,
            finalDisplayName: trimmedFinalName,
        };

        onConfirm(payload);
    };

    if (!sourceAlias || !targetAlias || !keepAlias || !removeAlias) {
        return null;
    }
    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="relative flex h-full w-full max-h-[92vh] max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-gray-400">
                            Normalización de cliente
                        </p>
                        <h2 className="mt-1 text-xl font-semibold text-gray-900">
                            Elegí el nombre oficial que quedará en tus OTs
                        </h2>
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

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3">
                        <Badge
                            variant="blue"
                            className="flex items-center gap-1 text-xs"
                        >
                            <Target className="h-3.5 w-3.5" />
                            {similarityScore.toFixed(1)}% similitud
                        </Badge>
                        <Badge
                            variant="secondary"
                            className="flex items-center gap-1 text-xs"
                        >
                            <FileText className="h-3.5 w-3.5" />
                            {loadingCount
                                ? "Calculando OTs..."
                                : `${otsCount} OTs a actualizar`}
                        </Badge>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700">
                            Seleccioná cuál nombre conservar
                        </p>
                        <div className="grid gap-3 md:grid-cols-2">
                            {[targetAlias, sourceAlias].map((alias) => {
                                const isSelected =
                                    selectedTargetId === alias.id;
                                const isSuggested = alias.id === targetAlias.id;
                                return (
                                    <button
                                        type="button"
                                        key={alias.id}
                                        onClick={() =>
                                            setSelectedTargetId(alias.id)
                                        }
                                        disabled={isLoading}
                                        className={`group flex h-full flex-col rounded-2xl border p-4 text-left transition-all ${
                                            isSelected
                                                ? "border-blue-500 bg-blue-50/60 shadow-sm"
                                                : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/30"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                                {isSuggested
                                                    ? "Sugerido"
                                                    : "Variante actual"}
                                            </span>
                                            <span
                                                className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                                                    isSelected
                                                        ? "border-blue-500 bg-blue-500 text-white"
                                                        : "border-gray-300 text-transparent"
                                                }`}
                                            >
                                                ✓
                                            </span>
                                        </div>
                                        <p className="mt-2 truncate text-sm font-semibold text-gray-900">
                                            {alias.original_name}
                                        </p>
                                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                            <span className="rounded-full bg-white/70 px-2 py-0.5 font-medium">
                                                {alias.usage_count || 0} usos
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs text-gray-500">
                            El nombre que no elijas será actualizado para
                            coincidir con el seleccionado.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <PenLine className="h-4 w-4 text-gray-400" />
                            Nombre final del cliente
                        </label>
                        <input
                            type="text"
                            value={finalName}
                            onChange={(e) => setFinalName(e.target.value)}
                            placeholder="Ej. INTRALOGIX, S.A."
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            disabled={isLoading}
                        />
                        <p className="text-xs text-gray-500">
                            Podés personalizarlo para dejar el formato exacto
                            que usará toda la organización.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                        <div className="flex items-start gap-3 text-sm text-gray-600">
                            <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                            <div className="space-y-1">
                                {loadingCount ? (
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Calculando impacto en OTs...
                                    </div>
                                ) : (
                                    <>
                                        <p>
                                            Se actualizarán{" "}
                                            <strong>{otsCount}</strong> OTs que
                                            hoy usan
                                            <span className="font-semibold text-gray-800">
                                                {" "}
                                                “{removeAlias.original_name}”.
                                            </span>
                                        </p>
                                        <p>
                                            Todas pasarán a utilizar{" "}
                                            <span className="font-semibold text-blue-600">
                                                “
                                                {finalName ||
                                                    keepAlias.original_name}
                                                ”
                                            </span>{" "}
                                            de ahora en adelante.
                                        </p>
                                    </>
                                )}
                                <p className="text-xs text-gray-400">
                                    El proceso es reversible desde historial si
                                    necesitás volver atrás.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label
                            className="text-sm font-medium text-gray-700"
                            htmlFor="normalization-notes"
                        >
                            Motivo de la normalización{" "}
                            <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="normalization-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej. Confirmado con el equipo de operaciones que se trata de la misma empresa."
                            rows={4}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            disabled={isLoading}
                        />
                        <p className="text-xs text-gray-500">
                            Las notas quedan guardadas para auditoría y futuras
                            revisiones.
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-gray-200 bg-gray-50 px-6 py-4">
                    <div className="text-xs text-gray-500">
                        <span className="font-medium text-gray-700">Tip:</span>{" "}
                        revisá el nombre final antes de confirmar, se aplicará
                        en todas las OTs mencionadas.
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={onCancel}
                            disabled={isLoading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={isConfirmDisabled}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Procesando...
                                </span>
                            ) : (
                                `Confirmar (${otsCount} OTs)`
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );

    return <ModalPortal>{modalContent}</ModalPortal>;
}

NormalizationModal.propTypes = {
    sourceAlias: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
            .isRequired,
        original_name: PropTypes.string,
        usage_count: PropTypes.number,
    }).isRequired,
    targetAlias: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
            .isRequired,
        original_name: PropTypes.string,
        usage_count: PropTypes.number,
    }).isRequired,
    similarityScore: PropTypes.number.isRequired,
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    isLoading: PropTypes.bool,
};

NormalizationModal.defaultProps = {
    isLoading: false,
};
