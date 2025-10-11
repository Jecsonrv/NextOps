import { z } from "zod";

/**
 * Schema de validación para Órdenes de Trabajo (OTs)
 * Basado en el modelo OT del backend Django
 */

// Schema para contenedores individuales
export const contenedorSchema = z.object({
    numero: z
        .string()
        .min(4, "Número de contenedor requerido")
        .transform((value) =>
            value.toUpperCase().replaceAll(" ", "").replaceAll("-", "")
        ),
});

// Schema para House BLs (solo strings en array)
export const houseBLSchema = z.string().min(1, "House BL no puede estar vacío");

// Schema para items de provisión
export const provisionItemSchema = z.object({
    concepto: z.string().min(1, "Concepto requerido"),
    monto: z.number().min(0, "El monto debe ser positivo"),
    moneda: z.string().optional().default("USD"),
    descripcion: z.string().optional().default(""),
});

// Schema principal de OT
export const otSchema = z.object({
    // Identificador único
    numero_ot: z
        .string()
        .min(1, "Número de OT requerido")
        .regex(/^[A-Z0-9-]+$/, "Solo mayúsculas, números y guiones")
        .toUpperCase(),

    // Relaciones
    proveedor_id: z.number().nullable().optional(),
    cliente_id: z.number().min(1, "Cliente requerido"),

    // Bill of Ladings
    master_bl: z.string().optional().default(""),
    house_bls: z.array(houseBLSchema).optional().default([]),

    // Contenedores
    contenedores: z.array(contenedorSchema).optional().default([]),

    // Fechas principales
    fecha_eta: z.string().nullable().optional(),
    fecha_llegada: z.string().nullable().optional(),
    etd: z.string().nullable().optional(),

    // Puertos
    puerto_origen: z.string().optional().default(""),
    puerto_destino: z.string().optional().default(""),

    // Información de embarque
    operativo: z.string().optional().default("-"),
    tipo_embarque: z.string().optional().default("-"),
    barco: z.string().optional().default("-"),

    // Fechas de facturación
    fecha_solicitud_facturacion: z.string().nullable().optional(),
    fecha_recepcion_factura: z.string().nullable().optional(),
    estado_facturado: z
        .enum(["pendiente", "facturado"])
        .optional()
        .default("pendiente"),

    // Express Release
    express_release_fecha: z.string().nullable().optional(),

    // Contra Entrega
    contra_entrega_fecha: z.string().nullable().optional(),

    // Envío de cierre
    envio_cierre_ot: z.string().nullable().optional(),

    // Comentarios
    comentarios: z.string().optional().default(""),

    // Provisiones
    fecha_provision: z.string().nullable().optional(),
    provision_source: z
        .enum(["manual", "csv", "excel"])
        .optional()
        .default("manual"),
    provision_locked: z.boolean().optional().default(false),
    estado_provision: z
        .enum(["pendiente", "provisionada", "revision", "disputada"])
        .optional()
        .default("pendiente"),

    // Estado de la OT
    estado: z
        .enum([
            "transito",
            "puerto",
            "en_rada",
            "almacenadora",
            "bodega",
            "desprendimiento",
            "fact_adicionales",
            "disputa",
            "cerrada",
            "finalizada",
        ])
        .optional()
        .default("transito"),

    // Tipo de operación
    tipo_operacion: z
        .enum(["importacion", "exportacion"])
        .optional()
        .default("importacion"),

    // Provision items (array de conceptos)
    provision_items: z.array(provisionItemSchema).optional().default([]),
});
