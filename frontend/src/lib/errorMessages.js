function normalizeErrorText(message) {
    if (!message) return "";

    const text = String(message).trim();

    const drfDetailMatch = text.match(/ErrorDetail\(string='([^']+)'/i);
    if (drfDetailMatch?.[1]) {
        return drfDetailMatch[1];
    }

    const simplePythonDictErrorDetail = text.match(
        /\{\s*'[^']+'\s*:\s*\[\s*ErrorDetail\(string='([^']+)'/i,
    );
    if (simplePythonDictErrorDetail?.[1]) {
        return simplePythonDictErrorDetail[1];
    }

    return text;
}

function getMessageFromValue(value) {
    if (!value) return "";

    if (Array.isArray(value)) {
        return getMessageFromValue(value[0]);
    }

    if (typeof value === "string") {
        return normalizeErrorText(value);
    }

    if (typeof value === "object") {
        if (value.string) {
            return normalizeErrorText(value.string);
        }

        if (typeof value.toString === "function") {
            const asText = value.toString();
            if (asText && asText !== "[object Object]") {
                return normalizeErrorText(asText);
            }
        }
    }

    return "";
}

export function extractApiErrorMessage(error, options = {}) {
    const { fallback = "Ocurrió un error inesperado.", fieldPriority = [] } =
        options;

    const data = error?.response?.data;

    if (!data) {
        return normalizeErrorText(error?.message || fallback);
    }

    if (typeof data === "string") {
        return normalizeErrorText(data);
    }

    if (Array.isArray(data)) {
        const message = getMessageFromValue(data);
        return message || normalizeErrorText(fallback);
    }

    const preferredKeys = [
        ...fieldPriority,
        "error",
        "detail",
        "message",
        "non_field_errors",
    ];

    for (const key of preferredKeys) {
        const value = data?.[key];
        if (!value) continue;

        const message = getMessageFromValue(value);
        if (message) return message;
    }

    for (const value of Object.values(data)) {
        const message = getMessageFromValue(value);
        if (message) return message;
    }

    return normalizeErrorText(error?.message || fallback);
}
