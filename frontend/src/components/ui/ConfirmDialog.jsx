import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { AlertTriangle, Info, CheckCircle, XCircle, X } from "lucide-react";
import { Button } from "./Button";
import { Card, CardContent, CardHeader, CardTitle } from "./Card";

const VARIANT_CONFIG = {
    danger: {
        icon: AlertTriangle,
        iconBg: "bg-red-100",
        iconColor: "text-red-600",
        confirmBg: "bg-red-600 hover:bg-red-700",
        title: "Confirmar eliminación",
    },
    warning: {
        icon: AlertTriangle,
        iconBg: "bg-yellow-100",
        iconColor: "text-yellow-600",
        confirmBg: "bg-yellow-600 hover:bg-yellow-700",
        title: "Confirmar acción",
    },
    info: {
        icon: Info,
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
        confirmBg: "bg-blue-600 hover:bg-blue-700",
        title: "Información",
    },
    success: {
        icon: CheckCircle,
        iconBg: "bg-green-100",
        iconColor: "text-green-600",
        confirmBg: "bg-green-600 hover:bg-green-700",
        title: "Confirmar",
    },
};

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    variant = "danger",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
}) {
    if (!isOpen) return null;

    const config = VARIANT_CONFIG[variant];
    const Icon = config.icon;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    const dialogContent = (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-md bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <CardHeader className="border-b pb-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${config.iconBg}`}>
                                <Icon className={`w-6 h-6 ${config.iconColor}`} />
                            </div>
                            <CardTitle className="text-lg font-semibold text-gray-900">
                                {title || config.title}
                            </CardTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-8 w-8"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="pt-6 pb-4">
                    <p className="text-gray-600 leading-relaxed">{message}</p>
                </CardContent>

                <div className="border-t px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 rounded-b-lg">
                    <Button variant="outline" onClick={onClose}>
                        {cancelText}
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        className={`${config.confirmBg} text-white`}
                    >
                        {confirmText}
                    </Button>
                </div>
            </Card>
        </div>
    );

    return createPortal(dialogContent, document.body);
}

ConfirmDialog.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    title: PropTypes.string,
    message: PropTypes.string.isRequired,
    variant: PropTypes.oneOf(["danger", "warning", "info", "success"]),
    confirmText: PropTypes.string,
    cancelText: PropTypes.string,
};
