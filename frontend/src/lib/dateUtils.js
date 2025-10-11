/**
 * Formatea una fecha al formato dd/mm/yyyy
 * @param {string|Date|null} date - Fecha en formato ISO (YYYY-MM-DD), objeto Date, o null
 * @returns {string} Fecha formateada como dd/mm/yyyy o "-" si no hay fecha
 */
function coerceToUtcDate(date) {
    if (!date) return null;

    let dateObj = null;

    if (date instanceof Date) {
        if (isNaN(date.getTime())) {
            return null;
        }
        // Normalizar al inicio del día en UTC para evitar desfases
        return new Date(
            Date.UTC(
                date.getUTCFullYear(),
                date.getUTCMonth(),
                date.getUTCDate()
            )
        );
    }

    if (typeof date === "string") {
        const trimmed = date.trim();
        const parts = trimmed.split("-");

        if (parts.length === 3 && parts[0].length === 4) {
            const year = Number(parts[0]);
            const month = Number(parts[1]);
            const day = Number(parts[2]);

            if (
                Number.isInteger(year) &&
                Number.isInteger(month) &&
                Number.isInteger(day)
            ) {
                dateObj = new Date(Date.UTC(year, month - 1, day));
            }
        }

        if (!dateObj) {
            const parsed = new Date(trimmed);
            if (!isNaN(parsed.getTime())) {
                dateObj = parsed;
            }
        }
    }

    if (typeof date === "number" && Number.isFinite(date)) {
        dateObj = new Date(date);
    }

    if (!dateObj || isNaN(dateObj.getTime())) {
        return null;
    }

    return new Date(
        Date.UTC(
            dateObj.getUTCFullYear(),
            dateObj.getUTCMonth(),
            dateObj.getUTCDate()
        )
    );
}

export function formatDate(date) {
    try {
        const dateObj = coerceToUtcDate(date);
        if (!dateObj) {
            return "-";
        }

        const day = String(dateObj.getUTCDate()).padStart(2, "0");
        const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
        const year = dateObj.getUTCFullYear();

        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error("Error formatting date:", error);
        return "-";
    }
}

export function formatDateLocalized(
    date,
    locale = "es-MX",
    options = { day: "2-digit", month: "long", year: "numeric" }
) {
    try {
        const dateObj = coerceToUtcDate(date);
        if (!dateObj) {
            return "-";
        }

        const formatter = new Intl.DateTimeFormat(locale, {
            timeZone: "UTC",
            ...options,
        });

        return formatter.format(dateObj);
    } catch (error) {
        console.error("Error formatting localized date:", error);
        return "-";
    }
}

/**
 * Formatea una fecha y hora al formato dd/mm/yyyy HH:mm
 * @param {string|Date|null} datetime - Fecha/hora en formato ISO o objeto Date
 * @returns {string} Fecha formateada como dd/mm/yyyy HH:mm o "-" si no hay fecha
 */
export function formatDateTime(datetime) {
    if (!datetime) return "-";

    try {
        const dateObj = new Date(datetime);

        if (isNaN(dateObj.getTime())) {
            return "-";
        }

        const day = String(dateObj.getDate()).padStart(2, "0");
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const year = dateObj.getFullYear();
        const hours = String(dateObj.getHours()).padStart(2, "0");
        const minutes = String(dateObj.getMinutes()).padStart(2, "0");

        return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
        console.error("Error formatting datetime:", error);
        return "-";
    }
}
