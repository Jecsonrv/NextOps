/**
 * Utilidades para notificaciones toast
 * Wrapper para react-hot-toast con estilos y mensajes personalizados
 */

import toast from "react-hot-toast";

/**
 * Toast de éxito
 * @param {string} message - Mensaje a mostrar
 * @param {object} options - Opciones adicionales de react-hot-toast
 */
export const showSuccess = (message, options = {}) => {
    return toast.success(message, {
        ...options,
    });
};

/**
 * Toast de error
 * @param {string} message - Mensaje a mostrar
 * @param {object} options - Opciones adicionales de react-hot-toast
 */
export const showError = (message, options = {}) => {
    return toast.error(message, {
        ...options,
    });
};

/**
 * Toast de advertencia
 * @param {string} message - Mensaje a mostrar
 * @param {object} options - Opciones adicionales de react-hot-toast
 */
export const showWarning = (message, options = {}) => {
    return toast(message, {
        icon: "⚠️",
        style: {
            border: "1px solid #f59e0b",
        },
        ...options,
    });
};

/**
 * Toast de información
 * @param {string} message - Mensaje a mostrar
 * @param {object} options - Opciones adicionales de react-hot-toast
 */
export const showInfo = (message, options = {}) => {
    return toast(message, {
        icon: "ℹ️",
        style: {
            border: "1px solid #3b82f6",
        },
        ...options,
    });
};

/**
 * Toast de carga (loading)
 * @param {string} message - Mensaje a mostrar
 * @param {object} options - Opciones adicionales de react-hot-toast
 */
export const showLoading = (message, options = {}) => {
    return toast.loading(message, {
        ...options,
    });
};

/**
 * Promesa con toast automático
 * Muestra loading mientras se ejecuta, success cuando se completa, error cuando falla
 * @param {Promise} promise - Promesa a ejecutar
 * @param {object} messages - Mensajes para cada estado { loading, success, error }
 * @param {object} options - Opciones adicionales de react-hot-toast
 */
export const showPromise = (promise, messages, options = {}) => {
    return toast.promise(
        promise,
        {
            loading: messages.loading || "Procesando...",
            success: messages.success || "¡Completado!",
            error: messages.error || "Ocurrió un error",
        },
        {
            ...options,
        }
    );
};

/**
 * Toast personalizado con JSX
 * @param {JSX.Element|string} content - Contenido del toast
 * @param {object} options - Opciones adicionales de react-hot-toast
 */
export const showCustom = (content, options = {}) => {
    return toast.custom(content, {
        ...options,
    });
};

/**
 * Descarta un toast específico o todos
 * @param {string} toastId - ID del toast a descartar (opcional)
 */
export const dismissToast = (toastId) => {
    if (toastId) {
        toast.dismiss(toastId);
    } else {
        toast.dismiss();
    }
};

/**
 * Toast de confirmación con botones
 * @param {string} message - Mensaje de confirmación
 * @param {Function} onConfirm - Callback cuando se confirma
 * @param {Function} onCancel - Callback cuando se cancela (opcional)
 * @returns {string} ID del toast
 */
export const showConfirm = (message, onConfirm, onCancel) => {
    return toast.custom(
        (t) => (
            <div
                className={`${
                    t.visible ? "animate-enter" : "animate-leave"
                } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex flex-col ring-1 ring-black ring-opacity-5`}
            >
                <div className="flex-1 p-4">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 pt-0.5">
                            <svg
                                className="h-6 w-6 text-orange-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="2"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                                />
                            </svg>
                        </div>
                        <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-gray-900">
                                {message}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex border-t border-gray-200 divide-x divide-gray-200">
                    <button
                        onClick={() => {
                            if (onCancel) onCancel();
                            toast.dismiss(t.id);
                        }}
                        className="w-full border-transparent rounded-none rounded-bl-lg px-4 py-3 flex items-center justify-center text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            toast.dismiss(t.id);
                        }}
                        className="w-full border-transparent rounded-none rounded-br-lg px-4 py-3 flex items-center justify-center text-sm font-medium text-blue-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        ),
        {
            duration: Infinity,
        }
    );
};

// Export default también para importación simple
export default {
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
    loading: showLoading,
    promise: showPromise,
    custom: showCustom,
    dismiss: dismissToast,
    confirm: showConfirm,
};
