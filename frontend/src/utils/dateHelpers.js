/**
 * Utilidades para manejo de fechas sin problemas de zona horaria
 */

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD usando la zona horaria local
 * Evita problemas de conversión con toISOString() que usa UTC
 *
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

/**
 * Convierte una fecha Date a formato YYYY-MM-DD sin cambios de zona horaria
 *
 * @param {Date} date - Fecha a convertir
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const formatDateForInput = (date) => {
    if (!date) return "";
    if (typeof date === "string") {
        // Si ya es string en formato YYYY-MM-DD, devolverlo tal cual
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date;
        }
        // Si es string en otro formato, convertir a Date primero
        date = new Date(date);
    }
    return getLocalDateString(date);
};

/**
 * Obtiene la fecha de hoy en formato YYYY-MM-DD
 * Alias de getLocalDateString() sin parámetros
 *
 * @returns {string} Fecha actual en formato YYYY-MM-DD
 */
export const getTodayString = () => getLocalDateString();

/**
 * Obtiene la fecha de ayer en formato YYYY-MM-DD
 *
 * @returns {string} Fecha de ayer en formato YYYY-MM-DD
 */
export const getYesterdayString = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return getLocalDateString(yesterday);
};

/**
 * Obtiene una fecha X días atrás en formato YYYY-MM-DD
 *
 * @param {number} days - Número de días atrás
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const getDaysAgoString = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return getLocalDateString(date);
};

/**
 * Obtiene una fecha X días adelante en formato YYYY-MM-DD
 *
 * @param {number} days - Número de días adelante
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const getDaysAheadString = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return getLocalDateString(date);
};

/**
 * Obtiene el primer día del mes actual en formato YYYY-MM-DD
 *
 * @returns {string} Primer día del mes en formato YYYY-MM-DD
 */
export const getFirstDayOfMonthString = () => {
    const date = new Date();
    date.setDate(1);
    return getLocalDateString(date);
};
