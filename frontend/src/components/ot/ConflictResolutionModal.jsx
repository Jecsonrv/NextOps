import { useState } from "react";
import PropTypes from "prop-types";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import {
    AlertCircle,
    CheckCircle,
    X,
    FileText,
    Database,
    ArrowRight,
    Loader2,
} from "lucide-react";

export function ConflictResolutionModal({
    conflicts,
    isOpen,
    onClose,
    onResolve,
    isResolving, // Nueva prop
}) {
    const [resolutions, setResolutions] = useState({});

    const initializeResolutions = () => {
        const initial = {};
        conflicts.forEach((conflict) => {
            const key = `${conflict.ot}-${conflict.campo}`;
            if (!resolutions[key]) {
                initial[key] = "mantener_actual";
            }
        });
        return { ...resolutions, ...initial };
    };

    const handleResolutionChange = (conflict, resolution) => {
        const key = `${conflict.ot}-${conflict.campo}`;
        setResolutions((prev) => ({
            ...prev,
            [key]: resolution,
        }));
    };

    const handleApplyAllNew = () => {
        const newResolutions = {};
        conflicts.forEach((conflict) => {
            const key = `${conflict.ot}-${conflict.campo}`;
            newResolutions[key] = "usar_nuevo";
        });
        setResolutions(newResolutions);
    };

    const handleKeepAllCurrent = () => {
        const newResolutions = {};
        conflicts.forEach((conflict) => {
            const key = `${conflict.ot}-${conflict.campo}`;
            newResolutions[key] = "mantener_actual";
        });
        setResolutions(newResolutions);
    };

    const handleConfirm = () => {
        const finalResolutions =
            Object.keys(resolutions).length > 0
                ? resolutions
                : initializeResolutions();

        const conflictResolutions = conflicts.map((conflict) => {
            const key = `${conflict.ot}-${conflict.campo}`;
            return {
                ot: conflict.ot,
                campo: conflict.campo,
                resolucion: finalResolutions[key] || "mantener_actual",
            };
        });

        onResolve(conflictResolutions);
    };

    const groupedConflicts = conflicts.reduce((acc, conflict) => {
        if (!acc[conflict.ot]) {
            acc[conflict.ot] = [];
        }
        acc[conflict.ot].push(conflict);
        return acc;
    }, {});

    return (
        <Dialog open={isOpen} onOpenChange={!isResolving ? onClose : () => {}}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="pb-4 border-b">
                    <DialogTitle className="flex items-center gap-3 text-xl">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <AlertCircle className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                            <div>Conflictos de Importación Detectados</div>
                            <div className="text-sm font-normal text-gray-500 mt-1">
                                Se encontraron {conflicts.length} conflicto
                                {conflicts.length !== 1 ? "s" : ""} en los
                                campos{" "}
                                <strong className="text-yellow-700">
                                    CLIENTE
                                </strong>{" "}
                                y/o{" "}
                                <strong className="text-yellow-700">
                                    OPERATIVO
                                </strong>
                            </div>
                        </div>
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-600 pt-2">
                        Por favor, seleccione qué valor desea mantener para cada
                        caso. Los demás campos se actualizarán automáticamente
                        sin generar conflictos.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-700">
                                Acciones rápidas:
                            </div>
                            <span className="text-xs text-gray-500">
                                Aplicar a todos los conflictos
                            </span>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleKeepAllCurrent}
                                disabled={isResolving}
                                className="bg-white hover:bg-gray-100 border-gray-300"
                            >
                                <Database className="h-4 w-4 mr-2" />
                                Mantener todos los actuales
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleApplyAllNew}
                                disabled={isResolving}
                                className="bg-white hover:bg-blue-50 border-blue-300 text-blue-700 hover:text-blue-800"
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Usar todos los del archivo
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 py-2 px-1">
                    {Object.entries(groupedConflicts).map(
                        ([ot, otConflicts]) => (
                            <div
                                key={ot}
                                className="border-2 border-blue-200 rounded-xl p-5 bg-gradient-to-br from-blue-50 to-white shadow-sm"
                            >
                                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-blue-200">
                                    <div className="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold text-sm">
                                        OT
                                    </div>
                                    <div className="font-bold text-xl text-blue-900">
                                        {ot}
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className="ml-auto bg-white"
                                    >
                                        {otConflicts.length} conflicto
                                        {otConflicts.length !== 1 ? "s" : ""}
                                    </Badge>
                                </div>

                                <div className="space-y-4">
                                    {otConflicts.map((conflict, idx) => {
                                        const key = `${conflict.ot}-${conflict.campo}`;
                                        const currentResolution =
                                            resolutions[key] ||
                                            "mantener_actual";

                                        return (
                                            <div
                                                key={`${ot}-${idx}`}
                                                className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                                            >
                                                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-5 py-3 border-b border-gray-200">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Badge
                                                                variant="outline"
                                                                className="uppercase font-bold text-sm px-3 py-1 bg-white border-2 border-purple-300 text-purple-700"
                                                            >
                                                                {conflict.campo}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-4">
                                                    <div className="grid grid-cols-[1fr,auto,1fr] gap-4 mb-4">
                                                        <div
                                                            className={`relative border-3 rounded-xl p-3 transition-all ${
                                                                currentResolution ===
                                                                "mantener_actual"
                                                                    ? "border-blue-500 bg-blue-50 shadow-lg shadow-blue-200"
                                                                    : "border-gray-300 bg-gray-50"
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Database className="h-4 w-4 text-gray-600" />
                                                                <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                                                                    Valor Actual
                                                                    (BD)
                                                                </div>
                                                            </div>
                                                            <div className="text-base font-bold text-gray-900 break-words">
                                                                {conflict.valor_actual || (
                                                                    <span className="text-gray-400 italic">
                                                                        (vacío)
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {currentResolution ===
                                                                "mantener_actual" && (
                                                                <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1">
                                                                    <CheckCircle className="h-5 w-5" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center justify-center">
                                                            <ArrowRight className="h-6 w-6 text-gray-400" />
                                                        </div>

                                                        <div
                                                            className={`relative border-3 rounded-xl p-3 transition-all ${
                                                                currentResolution ===
                                                                "usar_nuevo"
                                                                    ? "border-green-500 bg-green-50 shadow-lg shadow-green-200"
                                                                    : "border-gray-300 bg-gray-50"
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <FileText className="h-4 w-4 text-gray-600" />
                                                                <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                                                                    Valor Nuevo
                                                                    (Archivo)
                                                                </div>
                                                            </div>
                                                            <div className="text-base font-bold text-gray-900 break-words">
                                                                {conflict.valor_nuevo || (
                                                                    <span className="text-gray-400 italic">
                                                                        (vacío)
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {currentResolution ===
                                                                "usar_nuevo" && (
                                                                <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
                                                                    <CheckCircle className="h-5 w-5" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <button
                                                            onClick={() =>
                                                                handleResolutionChange(
                                                                    conflict,
                                                                    "mantener_actual"
                                                                )
                                                            }
                                                            disabled={isResolving}
                                                            className={`group relative py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                                                                currentResolution ===
                                                                "mantener_actual"
                                                                    ? "bg-blue-500 text-white shadow-md shadow-blue-300 scale-[1.02]"
                                                                    : "bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50"
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-center gap-2">
                                                                {currentResolution ===
                                                                "mantener_actual" ? (
                                                                    <CheckCircle className="h-4 w-4" />
                                                                ) : (
                                                                    <Database className="h-4 w-4" />
                                                                )}
                                                                <span>
                                                                    Mantener
                                                                    Actual
                                                                </span>
                                                            </div>
                                                        </button>

                                                        <button
                                                            onClick={() =>
                                                                handleResolutionChange(
                                                                    conflict,
                                                                    "usar_nuevo"
                                                                )
                                                            }
                                                            disabled={isResolving}
                                                            className={`group relative py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                                                                currentResolution ===
                                                                "usar_nuevo"
                                                                    ? "bg-green-500 text-white shadow-md shadow-green-300 scale-[1.02]"
                                                                    : "bg-white border-2 border-gray-300 text-gray-700 hover:border-green-400 hover:bg-green-50"
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-center gap-2">
                                                                {currentResolution ===
                                                                "usar_nuevo" ? (
                                                                    <CheckCircle className="h-4 w-4" />
                                                                ) : (
                                                                    <FileText className="h-4 w-4" />
                                                                )}
                                                                <span>
                                                                    Usar Nuevo
                                                                </span>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )
                    )}
                </div>

                <div className="border-t bg-gray-50 -mx-6 -mb-6 rounded-b-lg">
                    <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-6 mx-1">
                        <div className="text-sm text-gray-600">
                            Total de conflictos:{" "}
                            <strong className="text-gray-900">
                                {conflicts.length}
                            </strong>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                disabled={isResolving}
                                className="px-5 h-11"
                            >
                                <X className="h-4 w-4 mr-2" />
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                disabled={isResolving}
                                className="px-8 h-11 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
                            >
                                {isResolving ? (
                                    <>
                                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-5 w-5 mr-2" />
                                        Confirmar y Procesar ({conflicts.length})
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

ConflictResolutionModal.propTypes = {
    conflicts: PropTypes.arrayOf(
        PropTypes.shape({
            ot: PropTypes.string.isRequired,
            campo: PropTypes.string.isRequired,
            valor_actual: PropTypes.string,
            valor_nuevo: PropTypes.string,
            archivo_origen: PropTypes.string,
            row: PropTypes.number,
        })
    ).isRequired,
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onResolve: PropTypes.func.isRequired,
    isResolving: PropTypes.bool, // Nueva prop
};

ConflictResolutionModal.defaultProps = {
    isResolving: false,
};
