import * as XLSX from "xlsx";
import { formatDate } from "./dateUtils";

/**
 * Exportar lista de OTs a un archivo Excel con formato mejorado
 * @param {Array} ots - Array de objetos OT
 * @param {string} filename - Nombre del archivo (sin extensión)
 */
export function exportOTsToExcel(ots, filename = "OTs") {
    if (!ots || ots.length === 0) {
        alert("No hay datos para exportar");
        return;
    }

    // Preparar datos para exportar - TODAS LAS COLUMNAS
    const exportData = ots.map((ot) => ({
        "Número OT": ot.numero_ot || "",
        Estatus: ot.estado_display || ot.estado?.toUpperCase() || "",
        Cliente: ot.cliente_nombre || ot.cliente?.original_name || "",
        Operativo: ot.operativo || "",
        MBL: ot.mbl || ot.master_bl || "",
        Contenedores:
            ot.contenedores_list ||
            (Array.isArray(ot.contenedores)
                ? ot.contenedores.map((c) => c.numero).join(", ")
                : ""),
        Naviera: ot.proveedor_nombre || ot.proveedor?.nombre || "",
        Barco: ot.barco || "",
        "Fecha Provisión": formatDate(ot.fecha_provision),
        "Fecha Facturación": formatDate(ot.fecha_recepcion_factura),
        "Tipo Embarque": ot.tipo_embarque || "",
        "Puerto Origen": ot.puerto_origen || "",
        "Puerto Destino": ot.puerto_destino || "",
        ETD: formatDate(ot.etd),
        ETA: formatDate(ot.fecha_eta),
        "ETA Confirmada": formatDate(ot.fecha_llegada),
        "House BLs": Array.isArray(ot.house_bls) ? ot.house_bls.join(", ") : "",
        "Estado Provisión": ot.estado_provision?.toUpperCase() || "",
        "Estado Facturado": ot.estado_facturado?.toUpperCase() || "",
        "Express Release": formatDate(ot.express_release_fecha),
        "Contra Entrega": formatDate(ot.contra_entrega_fecha),
        "Solicitud Facturación": formatDate(ot.fecha_solicitud_facturacion),
        "Envío Cierre OT": formatDate(ot.envio_cierre_ot),
        "Fecha Creación": formatDate(ot.created_at),
        "Última Actualización": formatDate(ot.updated_at),
        Comentarios: ot.comentarios || "",
    }));

    // Crear worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Ajustar ancho de columnas
    const columnWidths = [
        { wch: 15 }, // Número OT
        { wch: 18 }, // Estatus
        { wch: 30 }, // Cliente
        { wch: 20 }, // Operativo
        { wch: 20 }, // MBL
        { wch: 40 }, // Contenedores
        { wch: 25 }, // Naviera
        { wch: 25 }, // Barco
        { wch: 15 }, // Fecha Provisión
        { wch: 15 }, // Fecha Facturación
        { wch: 15 }, // Tipo Embarque
        { wch: 25 }, // Puerto Origen
        { wch: 25 }, // Puerto Destino
        { wch: 12 }, // ETD
        { wch: 12 }, // ETA
        { wch: 15 }, // ETA Confirmada
        { wch: 35 }, // House BLs
        { wch: 18 }, // Estado Provisión
        { wch: 18 }, // Estado Facturado
        { wch: 15 }, // Express Release
        { wch: 15 }, // Contra Entrega
        { wch: 18 }, // Solicitud Facturación
        { wch: 15 }, // Envío Cierre OT
        { wch: 15 }, // Fecha Creación
        { wch: 18 }, // Última Actualización
        { wch: 40 }, // Comentarios
    ];
    ws["!cols"] = columnWidths;

    // Crear workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OTs");

    // Generar archivo
    const timestamp = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
}

/**
 * Exportar detalle de una sola OT con toda su información y formato mejorado
 * @param {Object} ot - Objeto OT completo
 */
export function exportOTDetailToExcel(ot) {
    if (!ot) {
        alert("No hay datos para exportar");
        return;
    }

    const wb = XLSX.utils.book_new();

    // Hoja 1: Información General con formato mejorado
    const generalData = [
        ["INFORMACIÓN GENERAL"],
        [""],
        ["Número OT", ot.numero_ot || ""],
        ["Estatus", ot.estado_display || ot.estado?.toUpperCase() || ""],
        ["Cliente", ot.cliente?.original_name || ""],
        ["Proveedor", ot.proveedor?.nombre || ""],
        ["Operativo", ot.operativo || ""],
        [""],
        ["TRANSPORTE Y EMBARQUE"],
        [""],
        ["Tipo Embarque", ot.tipo_embarque || ""],
        ["Master BL", ot.master_bl || ""],
        ["Barco", ot.barco || ""],
        ["Puerto Origen", ot.puerto_origen || ""],
        ["Puerto Destino", ot.puerto_destino || ""],
        [""],
        ["FECHAS DE TRANSPORTE"],
        [""],
        ["ETD", ot.etd || ""],
        ["ETA", ot.fecha_eta || ""],
        ["ETA Confirmada", ot.fecha_llegada || ""],
        [""],
        ["DOCUMENTOS Y FECHAS"],
        [""],
        ["Express Release", ot.express_release_fecha || "-"],
        ["Contra Entrega", ot.contra_entrega_fecha || "-"],
        ["Fecha Provisión", ot.fecha_provision || "-"],
        ["Estado Provisión", ot.estado_provision?.toUpperCase() || ""],
        ["Solicitud Facturación", ot.fecha_solicitud_facturacion || "-"],
        ["Recepción Factura", ot.fecha_recepcion_factura || "-"],
        ["Estado Facturado", ot.estado_facturado?.toUpperCase() || ""],
        ["Envío Cierre OT", ot.envio_cierre_ot || "-"],
        [""],
        ["INFORMACIÓN ADICIONAL"],
        [""],
        ["Comentarios", ot.comentarios || ""],
        [""],
        ["Fecha Creación", formatDate(ot.created_at)],
        ["Última Actualización", formatDate(ot.updated_at)],
    ];

    const wsGeneral = XLSX.utils.aoa_to_sheet(generalData);
    wsGeneral["!cols"] = [{ wch: 30 }, { wch: 50 }];

    // Aplicar estilos a los títulos de sección
    const sectionTitles = [0, 8, 16, 22, 33];
    sectionTitles.forEach((row) => {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: 0 });
        if (wsGeneral[cellRef]) {
            wsGeneral[cellRef].s = {
                font: { bold: true, sz: 14, color: { rgb: "2563EB" } },
                fill: { fgColor: { rgb: "EFF6FF" } },
                alignment: { horizontal: "left", vertical: "center" },
            };
        }
    });

    // Aplicar estilo a las etiquetas (columna izquierda)
    generalData.forEach((row, idx) => {
        if (
            row.length > 0 &&
            row[0] &&
            !sectionTitles.includes(idx) &&
            row[0] !== ""
        ) {
            const cellRef = XLSX.utils.encode_cell({ r: idx, c: 0 });
            if (wsGeneral[cellRef]) {
                wsGeneral[cellRef].s = {
                    font: { bold: true, sz: 11 },
                    alignment: { horizontal: "right", vertical: "center" },
                    fill: { fgColor: { rgb: "F3F4F6" } },
                };
            }
        }
    });

    XLSX.utils.book_append_sheet(wb, wsGeneral, "Información General");

    // Hoja 2: House BLs con formato
    if (ot.house_bls && ot.house_bls.length > 0) {
        const houseBLsData = [
            ["House BL"],
            ...ot.house_bls.map((hbl) => [hbl]),
        ];
        const wsHouseBLs = XLSX.utils.aoa_to_sheet(houseBLsData);
        wsHouseBLs["!cols"] = [{ wch: 30 }];

        XLSX.utils.book_append_sheet(wb, wsHouseBLs, "House BLs");
    }

    // Hoja 3: Contenedores con formato
    if (ot.contenedores && ot.contenedores.length > 0) {
        const contenedoresData = ot.contenedores.map((c) => ({
            Número: c.numero || "",
            Tipo: c.tipo || "",
            Peso: c.peso || "",
            Sello: c.sello || "",
        }));
        const wsContenedores = XLSX.utils.json_to_sheet(contenedoresData);
        wsContenedores["!cols"] = [
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
            { wch: 20 },
        ];

        XLSX.utils.book_append_sheet(wb, wsContenedores, "Contenedores");
    }

    // Hoja 4: Provisiones con formato (si existen)
    if (ot.provision_hierarchy && ot.provision_hierarchy.items) {
        const provisionData = ot.provision_hierarchy.items.map((item) => ({
            Concepto: item.concepto || "",
            Monto: item.monto || 0,
            Moneda: item.moneda || "USD",
            Descripción: item.descripcion || "",
        }));

        // Agregar total al final
        provisionData.push({
            Concepto: "TOTAL",
            Monto: ot.provision_hierarchy.total || 0,
            Moneda: "USD",
            Descripción: "",
        });

        const wsProvision = XLSX.utils.json_to_sheet(provisionData);
        wsProvision["!cols"] = [
            { wch: 30 },
            { wch: 15 },
            { wch: 10 },
            { wch: 40 },
        ];

        XLSX.utils.book_append_sheet(wb, wsProvision, "Provisiones");
    }

    // Generar archivo
    XLSX.writeFile(
        wb,
        `OT_${ot.numero_ot}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
}

/**
 * Descargar plantilla de Excel para importación con formato mejorado
 */
export function downloadImportTemplate() {
    const templateData = [
        {
            "Número OT": "OT-2025-001",
            Cliente: "Empresa ABC",
            Naviera: "Naviera XYZ",
            "Master BL": "MAEU123456789",
            "House BL": "HBL001, HBL002",
            Contenedores: "MSCU1234567, TCLU9876543",
            Operativo: "Juan Pérez",
            "Tipo Embarque": "FCL",
            Barco: "MSC OSLO",
            "Puerto Origen": "Shanghai, China",
            "Puerto Destino": "Valparaíso, Chile",
            ETD: "2025-01-10",
            ETA: "2025-01-25",
            "ETA Confirmada": "2025-01-26",
            "Express Release": "2025-01-28",
            "Contra Entrega": "2025-01-30",
            "Fecha Provisión": "2025-02-01",
            "Estado Provisión": "PENDIENTE",
            "Solicitud Facturación": "2025-02-05",
            "Recepción Factura": "2025-02-10",
            "Estado Facturado": "PENDIENTE",
            Comentarios: "Carga de ejemplo",
        },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);

    // Ajustar anchos
    ws["!cols"] = [
        { wch: 15 }, // Número OT
        { wch: 25 }, // Cliente
        { wch: 25 }, // Naviera
        { wch: 20 }, // Master BL
        { wch: 30 }, // House BL
        { wch: 35 }, // Contenedores
        { wch: 20 }, // Operativo
        { wch: 15 }, // Tipo Embarque
        { wch: 20 }, // Barco
        { wch: 25 }, // Puerto Origen
        { wch: 25 }, // Puerto Destino
        { wch: 12 }, // ETD
        { wch: 12 }, // ETA
        { wch: 15 }, // ETA Confirmada
        { wch: 15 }, // Express Release
        { wch: 15 }, // Contra Entrega
        { wch: 15 }, // Fecha Provisión
        { wch: 18 }, // Estado Provisión
        { wch: 18 }, // Solicitud Facturación
        { wch: 18 }, // Recepción Factura
        { wch: 18 }, // Estado Facturado
        { wch: 40 }, // Comentarios
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla OTs");

    // Agregar hoja de instrucciones con formato
    const instructionsData = [
        ["INSTRUCCIONES PARA IMPORTAR OTs"],
        [""],
        ["PASOS PARA IMPORTAR:"],
        ["1. Complete la información en la hoja 'Plantilla OTs'"],
        ["2. Los campos 'Número OT' y 'Cliente' son OBLIGATORIOS"],
        ["3. Puede agregar múltiples House BLs separados por comas"],
        ["4. Puede agregar múltiples contenedores separados por comas"],
        ["5. Las fechas deben estar en formato YYYY-MM-DD (ej: 2025-01-15)"],
        ["6. El sistema detectará automáticamente los encabezados"],
        ["7. Puede usar nombres de columnas alternativos (ver abajo)"],
        ["8. Todos los valores de texto se guardarán en MAYÚSCULAS"],
        [""],
        ["COLUMNAS PRINCIPALES Y SUS VARIACIONES RECONOCIDAS:"],
        [""],
        ["• NÚMERO OT:"],
        ["  - OT, Número OT, O.T., Orden de Trabajo, No. OT"],
        [""],
        ["• CLIENTE (OBLIGATORIO):"],
        ["  - Cliente, Consignatario, Shipper, Nombre del Cliente"],
        [""],
        ["• NAVIERA:"],
        ["  - Naviera, Proveedor, Shipping Line, Línea Naviera"],
        [""],
        ["• MASTER BL:"],
        ["  - Master BL, MBL, Bill of Lading, BL, Master"],
        [""],
        ["• OPERATIVO:"],
        ["  - Operativo, Responsable, Ejecutivo, Encargado"],
        [""],
        ["• CONTENEDORES:"],
        ["  - Contenedor, Container, Contenedores, Ctns"],
        [""],
        ["• FECHAS:"],
        ["  - ETD: Fecha ETD, Departure Date, Fecha Salida"],
        ["  - ETA: Fecha ETA, Arrival Date, Fecha Estimada"],
        ["  - ETA Confirmada: Llegada Real, Atraque, Fecha Llegada"],
        ["  - Express Release: Fecha Express Release"],
        ["  - Contra Entrega: Fecha Contra Entrega"],
        ["  - Fecha Provisión: Provisión, Fecha Prov."],
        [""],
        ["• ESTADOS VÁLIDOS:"],
        [
            "  - Estados disponibles: ALMACENADORA, BODEGA, CERRADA, DESPRENDIMIENTO,",
        ],
        [
            "    DISPUTA, EN RADA, FACT ADICIONALES, FINALIZADA, PUERTO, TRANSITO",
        ],
        ["  - Estado por defecto: TRANSITO"],
        [""],
        ["NOTAS IMPORTANTES:"],
        ["• El sistema es flexible con los nombres de columnas"],
        ["• No distingue mayúsculas/minúsculas en los encabezados"],
        ["• Los datos se guardarán en MAYÚSCULAS automáticamente"],
        ["• Si hay errores, se continuará procesando las demás filas"],
        ["• Recibirá un reporte detallado al finalizar la importación"],
    ];

    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    wsInstructions["!cols"] = [{ wch: 90 }];

    // Estilo para los títulos principales
    [0, 2, 12].forEach((row) => {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: 0 });
        if (wsInstructions[cellRef]) {
            wsInstructions[cellRef].s = {
                font: { bold: true, sz: 14, color: { rgb: "1E40AF" } },
                fill: { fgColor: { rgb: "DBEAFE" } },
                alignment: { horizontal: "left", vertical: "center" },
            };
        }
    });

    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instrucciones");

    XLSX.writeFile(wb, "Plantilla_Importacion_OTs.xlsx", { cellStyles: true });
}
