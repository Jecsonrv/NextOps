import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../lib/api";
import { otSchema } from "../lib/validations/otSchema";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Plus, Trash2, Save, X } from "lucide-react";

/**
 * Componente de formulario para crear/editar OTs
 * Usa React Hook Form + Zod para validación
 */
export function OTForm({
    defaultValues = null,
    onSubmit,
    onCancel,
    isLoading = false,
    mode = "create",
}) {
    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
        watch,
        setValue,
        reset,
    } = useForm({
        resolver: zodResolver(otSchema),
        defaultValues: defaultValues || {
            numero_ot: "",
            cliente_id: null,
            proveedor_id: null,
            master_bl: "",
            house_bls: [],
            contenedores: [],
            fecha_eta: "",
            fecha_llegada: "",
            etd: "",
            puerto_origen: "",
            puerto_destino: "",
            operativo: "",
            tipo_embarque: "",
            barco: "",
            estado: "transito",
            estado_provision: "pendiente",
            estado_facturado: "pendiente",
            tipo_operacion: "importacion",
            comentarios: "",
            fecha_provision: "",
            express_release_fecha: "",
            contra_entrega_fecha: "",
        },
    });

    // Cargar lista de clientes
    const {
        data: clientes = [],
        isLoading: isLoadingClientes,
        error: errorClientes,
    } = useQuery({
        queryKey: ["clientes"],
        queryFn: async () => {
            const response = await apiClient.get(
                "/clients/client-aliases/?page_size=1000"
            );
            return response.data.results || [];
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
        retry: 1,
    });

    // Cargar lista de proveedores
    const {
        data: proveedores = [],
        isLoading: isLoadingProveedores,
        error: errorProveedores,
    } = useQuery({
        queryKey: ["proveedores"],
        queryFn: async () => {
            const response = await apiClient.get(
                "/catalogs/providers/?page_size=1000"
            );
            return response.data.results || [];
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
        retry: 1,
    });

    const selectedClienteId = defaultValues?.cliente_id ?? null;
    const selectedClienteInfo = defaultValues?.cliente ?? null;
    const selectedProveedorId = defaultValues?.proveedor_id ?? null;
    const selectedProveedorInfo = defaultValues?.proveedor ?? null;

    const clienteOptions = useMemo(() => {
        if (!Array.isArray(clientes)) {
            return [];
        }

        if (!selectedClienteId) {
            return clientes;
        }

        const clienteIdAsNumber = Number(selectedClienteId);
        const exists = clientes.some(
            (cliente) => Number(cliente?.id) === clienteIdAsNumber
        );

        if (exists) {
            return clientes;
        }

        const fallbackName =
            selectedClienteInfo?.original_name ||
            selectedClienteInfo?.nombre ||
            selectedClienteInfo?.name ||
            selectedClienteInfo?.razon_social ||
            selectedClienteInfo?.alias ||
            `Cliente #${clienteIdAsNumber}`;

        const fallbackOption = {
            id: clienteIdAsNumber,
            original_name: fallbackName,
            _isFallback: true,
        };

        return [fallbackOption, ...clientes];
    }, [clientes, selectedClienteId, selectedClienteInfo]);

    const proveedorOptions = useMemo(() => {
        if (!Array.isArray(proveedores)) {
            return [];
        }

        if (!selectedProveedorId) {
            return proveedores;
        }

        const proveedorIdAsNumber = Number(selectedProveedorId);
        const exists = proveedores.some(
            (proveedor) => Number(proveedor?.id) === proveedorIdAsNumber
        );

        if (exists) {
            return proveedores;
        }

        const fallbackName =
            selectedProveedorInfo?.nombre ||
            selectedProveedorInfo?.name ||
            selectedProveedorInfo?.razon_social ||
            selectedProveedorInfo?.alias ||
            `Proveedor #${proveedorIdAsNumber}`;

        const fallbackOption = {
            id: proveedorIdAsNumber,
            nombre: fallbackName,
            _isFallback: true,
        };

        return [fallbackOption, ...proveedores];
    }, [proveedores, selectedProveedorId, selectedProveedorInfo]);

    const isSelectedClienteMissing = useMemo(() => {
        if (!selectedClienteId) {
            return false;
        }
        const clienteIdAsNumber = Number(selectedClienteId);
        return !clientes.some(
            (cliente) => Number(cliente?.id) === clienteIdAsNumber
        );
    }, [clientes, selectedClienteId]);

    const isSelectedProveedorMissing = useMemo(() => {
        if (!selectedProveedorId) {
            return false;
        }
        const proveedorIdAsNumber = Number(selectedProveedorId);
        return !proveedores.some(
            (proveedor) => Number(proveedor?.id) === proveedorIdAsNumber
        );
    }, [proveedores, selectedProveedorId]);

    const getClienteLabel = (cliente) =>
        cliente?.original_name ||
        cliente?.nombre ||
        cliente?.name ||
        cliente?.razon_social ||
        cliente?.alias ||
        `Cliente #${cliente?.id}`;

    const getProveedorLabel = (proveedor) =>
        proveedor?.nombre ||
        proveedor?.name ||
        proveedor?.razon_social ||
        proveedor?.alias ||
        `Proveedor #${proveedor?.id}`;

    // Referencias para rastrear el último valor guardado (evitar bucles infinitos)
    const lastFechaProvision = useRef("");
    const lastEstadoProvision = useRef("");
    const lastFechaFactura = useRef("");
    const lastEstadoFacturado = useRef("");
    const isProvisionInitialized = useRef(false);
    const isFacturacionInitialized = useRef(false);
    const lastLoadedOtId = useRef(null);

    // Lógica para Provisión - Solo auto-actualizar cuando se agrega fecha
    const fechaProvision = watch("fecha_provision");
    const estadoProvision = watch("estado_provision");

    useEffect(() => {
        if (!defaultValues) {
            return;
        }

        const {
            id: defaultId = null,
            numero_ot: defaultNumeroOt = null,
            fecha_provision: defaultFechaProvision = "",
            estado_provision: defaultEstadoProvision = "pendiente",
            fecha_recepcion_factura: defaultFechaFactura = "",
            estado_facturado: defaultEstadoFacturado = "pendiente",
        } = defaultValues ?? {};

        const nextIdentifier = defaultId ?? defaultNumeroOt;

        if (nextIdentifier && lastLoadedOtId.current === nextIdentifier) {
            return;
        }

        reset({
            ...defaultValues,
        });

        if (nextIdentifier) {
            lastLoadedOtId.current = nextIdentifier;
        }

        lastFechaProvision.current = defaultFechaProvision || "";
        lastEstadoProvision.current = defaultEstadoProvision || "pendiente";
        lastFechaFactura.current = defaultFechaFactura || "";
        lastEstadoFacturado.current = defaultEstadoFacturado || "pendiente";
        isProvisionInitialized.current = false;
        isFacturacionInitialized.current = false;
    }, [defaultValues, reset]);

    useEffect(() => {
        if (!isProvisionInitialized.current) {
            lastFechaProvision.current = fechaProvision || "";
            lastEstadoProvision.current = estadoProvision || "";
            isProvisionInitialized.current = true;
            return;
        }

        const hasNewFecha =
            Boolean(fechaProvision && fechaProvision.trim() !== "") &&
            fechaProvision !== lastFechaProvision.current;
        const shouldAutoupdate = hasNewFecha && estadoProvision === "pendiente";

        // Solo actualizar estado a "provisionada" cuando:
        // 1. Se agrega una nueva fecha (que no estaba antes)
        // 2. Y el estado actual es "pendiente"
        if (shouldAutoupdate) {
            lastFechaProvision.current = fechaProvision;
            setValue("estado_provision", "provisionada");
            setValue("provision_source", "manual");
        } else if (!fechaProvision || fechaProvision.trim() === "") {
            lastFechaProvision.current = "";
        } else {
            lastFechaProvision.current = fechaProvision;
        }
    }, [fechaProvision, estadoProvision, setValue]);

    // Actualizar referencia del estado y limpiar fecha cuando aplica
    useEffect(() => {
        if (!isProvisionInitialized.current) {
            return;
        }

        const estadoAnterior = lastEstadoProvision.current;
        const requiereResetFecha =
            estadoProvision &&
            ["revision", "disputada"].includes(estadoProvision) &&
            estadoAnterior !== estadoProvision;

        if (requiereResetFecha) {
            setValue("fecha_provision", "", {
                shouldDirty: true,
                shouldValidate: true,
            });
            lastFechaProvision.current = "";
        }

        if (estadoProvision) {
            lastEstadoProvision.current = estadoProvision;
        } else {
            lastEstadoProvision.current = "";
        }
    }, [estadoProvision, setValue]);

    // Lógica para Facturación - Solo auto-actualizar cuando se agrega fecha
    const fechaRecepcionFactura = watch("fecha_recepcion_factura");
    const estadoFacturado = watch("estado_facturado");

    useEffect(() => {
        if (!isFacturacionInitialized.current) {
            lastFechaFactura.current = fechaRecepcionFactura || "";
            lastEstadoFacturado.current = estadoFacturado || "";
            isFacturacionInitialized.current = true;
            return;
        }

        const hasNewFecha =
            Boolean(
                fechaRecepcionFactura && fechaRecepcionFactura.trim() !== ""
            ) && fechaRecepcionFactura !== lastFechaFactura.current;
        const shouldAutoupdate = hasNewFecha && estadoFacturado === "pendiente";

        // Solo actualizar estado a "facturado" cuando:
        // 1. Se agrega una nueva fecha (que no estaba antes)
        // 2. Y el estado actual es "pendiente"
        if (shouldAutoupdate) {
            lastFechaFactura.current = fechaRecepcionFactura;
            setValue("estado_facturado", "facturado");
        } else if (
            !fechaRecepcionFactura ||
            fechaRecepcionFactura.trim() === ""
        ) {
            lastFechaFactura.current = "";
        } else {
            lastFechaFactura.current = fechaRecepcionFactura;
        }
    }, [fechaRecepcionFactura, estadoFacturado, setValue]);

    // Actualizar referencia del estado sin hacer cambios automáticos
    useEffect(() => {
        if (!isFacturacionInitialized.current) {
            return;
        }

        const estadoAnterior = lastEstadoFacturado.current;

        if (
            estadoFacturado === "pendiente" &&
            estadoAnterior &&
            estadoAnterior !== "pendiente"
        ) {
            setValue("fecha_solicitud_facturacion", "", {
                shouldDirty: true,
                shouldValidate: true,
            });
            setValue("fecha_recepcion_factura", "", {
                shouldDirty: true,
                shouldValidate: true,
            });
            lastFechaFactura.current = "";
        }

        if (estadoFacturado) {
            lastEstadoFacturado.current = estadoFacturado;
        } else {
            lastEstadoFacturado.current = "";
        }
    }, [estadoFacturado, setValue]);

    // Field arrays para listas dinámicas
    const {
        fields: houseBLFields,
        append: appendHouseBL,
        remove: removeHouseBL,
    } = useFieldArray({
        control,
        name: "house_bls",
    });

    const {
        fields: contenedorFields,
        append: appendContenedor,
        remove: removeContenedor,
    } = useFieldArray({
        control,
        name: "contenedores",
    });

    const handleFormSubmit = (data) => {
        // Transformar datos antes de enviar
        const transformedData = {
            ...data,
            // Convertir fechas vacías a null
            fecha_eta: data.fecha_eta || null,
            fecha_llegada: data.fecha_llegada || null,
            etd: data.etd || null,
            fecha_solicitud_facturacion:
                data.fecha_solicitud_facturacion || null,
            fecha_recepcion_factura: data.fecha_recepcion_factura || null,
            fecha_provision: data.fecha_provision || null,
            express_release_fecha: data.express_release_fecha || null,
            contra_entrega_fecha: data.contra_entrega_fecha || null,
            envio_cierre_ot: data.envio_cierre_ot || null,
        };
        onSubmit(transformedData);
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Información Básica */}
            <Card>
                <CardHeader>
                    <CardTitle>Información Básica</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Número de OT <span className="text-red-500">*</span>
                        </label>
                        <Input
                            {...register("numero_ot")}
                            placeholder="OT-2025-001"
                            className={errors.numero_ot ? "border-red-500" : ""}
                            disabled={mode === "edit"}
                        />
                        {errors.numero_ot && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.numero_ot.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Cliente <span className="text-red-500">*</span>
                        </label>
                        <select
                            {...register("cliente_id", { valueAsNumber: true })}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.cliente_id
                                    ? "border-red-500"
                                    : "border-gray-300"
                            }`}
                            disabled={isLoadingClientes && !selectedClienteId}
                        >
                            <option value="">Seleccionar cliente...</option>
                            {clienteOptions.length > 0 ? (
                                clienteOptions.map((cliente) => {
                                    const label = getClienteLabel(cliente);
                                    const isFallbackOption =
                                        isSelectedClienteMissing &&
                                        Number(cliente?.id) ===
                                            Number(selectedClienteId);

                                    return (
                                        <option
                                            key={cliente.id}
                                            value={cliente.id}
                                        >
                                            {label}
                                            {isFallbackOption
                                                ? " (no listado)"
                                                : ""}
                                        </option>
                                    );
                                })
                            ) : (
                                <option disabled>
                                    {isLoadingClientes
                                        ? "Cargando clientes..."
                                        : errorClientes
                                        ? "Error al cargar clientes"
                                        : "No hay clientes disponibles"}
                                </option>
                            )}
                        </select>
                        {errors.cliente_id && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.cliente_id.message}
                            </p>
                        )}
                        {errorClientes && (
                            <p className="text-red-500 text-xs mt-1">
                                Error al cargar clientes:{" "}
                                {errorClientes.message || "Error desconocido"}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Proveedor (Naviera)
                        </label>
                        <select
                            {...register("proveedor_id", {
                                valueAsNumber: true,
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={
                                isLoadingProveedores && !selectedProveedorId
                            }
                        >
                            <option value="">Sin proveedor...</option>
                            {proveedorOptions.length > 0 ? (
                                proveedorOptions.map((proveedor) => {
                                    const label = getProveedorLabel(proveedor);
                                    const isFallbackOption =
                                        isSelectedProveedorMissing &&
                                        Number(proveedor?.id) ===
                                            Number(selectedProveedorId);

                                    return (
                                        <option
                                            key={proveedor.id}
                                            value={proveedor.id}
                                        >
                                            {label}
                                            {isFallbackOption
                                                ? " (no listado)"
                                                : ""}
                                        </option>
                                    );
                                })
                            ) : (
                                <option disabled>
                                    {isLoadingProveedores
                                        ? "Cargando proveedores..."
                                        : errorProveedores
                                        ? "Error al cargar proveedores"
                                        : "No hay proveedores disponibles"}
                                </option>
                            )}
                        </select>
                        {errorProveedores && (
                            <p className="text-red-500 text-xs mt-1">
                                Error al cargar proveedores:{" "}
                                {errorProveedores.message ||
                                    "Error desconocido"}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Tipo de Operación{" "}
                            <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() =>
                                    setValue("tipo_operacion", "importacion")
                                }
                                className={`flex-1 py-1.5 px-3 text-sm rounded-md transition-colors ${
                                    watch("tipo_operacion") === "importacion"
                                        ? "bg-blue-500 text-white"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                Importación
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setValue("tipo_operacion", "exportacion")
                                }
                                className={`flex-1 py-1.5 px-3 text-sm rounded-md transition-colors ${
                                    watch("tipo_operacion") === "exportacion"
                                        ? "bg-yellow-500 text-white"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                Exportación
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Estado / Estatus
                        </label>
                        <select
                            {...register("estado")}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="transito">Tránsito</option>
                            <option value="puerto">Puerto</option>
                            <option value="en_rada">En Rada</option>
                            <option value="almacenadora">Almacenadora</option>
                            <option value="bodega">Bodega</option>
                            <option value="desprendimiento">
                                Desprendimiento
                            </option>
                            <option value="fact_adicionales">
                                Fact. Adicionales
                            </option>
                            <option value="disputa">Disputa</option>
                            <option value="cerrada">Cerrada</option>
                            <option value="finalizada">Finalizada</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Estado Provisión
                        </label>
                        <select
                            {...register("estado_provision")}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 cursor-not-allowed"
                        >
                            <option value="pendiente">Pendiente</option>
                            <option value="provisionada">Provisionada</option>
                            <option value="revision">En Revisión</option>
                            <option value="disputada">Disputada</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Se actualiza automáticamente en la sección de
                            Provisión
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Estado Facturado
                        </label>
                        <select
                            {...register("estado_facturado")}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 cursor-not-allowed"
                        >
                            <option value="pendiente">Pendiente</option>
                            <option value="facturado">Facturado</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Se actualiza automáticamente en la sección de
                            Facturación
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Operativo
                        </label>
                        <Input
                            {...register("operativo")}
                            placeholder="Nombre del operativo"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Tipo de Embarque
                        </label>
                        <Input
                            {...register("tipo_embarque")}
                            placeholder="FCL, LCL, etc."
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Bills of Lading */}
            <Card>
                <CardHeader>
                    <CardTitle>Bills of Lading</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Master BL
                        </label>
                        <Input
                            {...register("master_bl")}
                            placeholder="MAEU123456789"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium">
                                House BLs
                            </label>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => appendHouseBL("")}
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Agregar House BL
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {houseBLFields.map((field, index) => (
                                <div key={field.id} className="flex gap-2">
                                    <Input
                                        {...register(`house_bls.${index}`)}
                                        placeholder={`House BL ${index + 1}`}
                                        className="flex-1"
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => removeHouseBL(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {houseBLFields.length === 0 && (
                                <p className="text-sm text-gray-500">
                                    No hay House BLs agregados
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Contenedores */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Contenedores</CardTitle>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                                appendContenedor({
                                    numero: "",
                                })
                            }
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Agregar Contenedor
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {contenedorFields.map((field, index) => (
                            <div
                                key={field.id}
                                className="p-4 border border-gray-200 rounded-lg space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <Badge>Contenedor {index + 1}</Badge>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => removeContenedor(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Número{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        {...register(
                                            `contenedores.${index}.numero`
                                        )}
                                        placeholder="MSCU1234567"
                                    />
                                </div>
                            </div>
                        ))}

                        {contenedorFields.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">
                                No hay contenedores agregados
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Transporte y Puertos */}
            <Card>
                <CardHeader>
                    <CardTitle>Transporte y Puertos</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Barco/Buque
                        </label>
                        <Input
                            {...register("barco")}
                            placeholder="Nombre del barco"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            ETD (Fecha Salida)
                        </label>
                        <Input type="date" {...register("etd")} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Puerto Origen
                        </label>
                        <Input
                            {...register("puerto_origen")}
                            placeholder="Shanghai, China"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Puerto Destino
                        </label>
                        <Input
                            {...register("puerto_destino")}
                            placeholder="Valparaíso, Chile"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            ETA (Fecha Estimada Llegada)
                        </label>
                        <Input type="date" {...register("fecha_eta")} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Fecha Llegada Real
                        </label>
                        <Input type="date" {...register("fecha_llegada")} />
                    </div>
                </CardContent>
            </Card>

            {/* Provisiones */}
            <Card>
                <CardHeader>
                    <CardTitle>Provisión de Costos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Fecha Provisión
                            </label>
                            <Input
                                type="date"
                                {...register("fecha_provision")}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Estado Provisión
                            </label>
                            <select
                                {...register("estado_provision")}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="pendiente">Pendiente</option>
                                <option value="provisionada">
                                    Provisionada
                                </option>
                                <option value="revision">En Revisión</option>
                                <option value="disputada">Disputada</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Se actualiza automáticamente al ingresar la
                                fecha, pero puedes cambiarlo manualmente
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Fuente
                            </label>
                            <select
                                {...register("provision_source")}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="manual">Manual</option>
                                <option value="csv">CSV</option>
                                <option value="excel">Excel</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Facturación */}
            <Card>
                <CardHeader>
                    <CardTitle>Facturación</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Fecha Solicitud Facturación
                        </label>
                        <Input
                            type="date"
                            {...register("fecha_solicitud_facturacion")}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Fecha Recepción Factura
                        </label>
                        <Input
                            type="date"
                            {...register("fecha_recepcion_factura")}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Estado Facturado
                        </label>
                        <select
                            {...register("estado_facturado")}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="pendiente">Pendiente</option>
                            <option value="facturado">Facturado</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Se actualiza automáticamente al ingresar la fecha de
                            recepción, pero puedes cambiarlo manualmente
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Express Release y Contra Entrega */}
            <Card>
                <CardHeader>
                    <CardTitle>Express Release y Contra Entrega</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Express Release Fecha
                        </label>
                        <Input
                            type="date"
                            {...register("express_release_fecha")}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Contra Entrega Fecha
                        </label>
                        <Input
                            type="date"
                            {...register("contra_entrega_fecha")}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Envío Cierre OT
                        </label>
                        <Input type="date" {...register("envio_cierre_ot")} />
                    </div>
                </CardContent>
            </Card>

            {/* Comentarios */}
            <Card>
                <CardHeader>
                    <CardTitle>Comentarios y Notas</CardTitle>
                </CardHeader>
                <CardContent>
                    <textarea
                        {...register("comentarios")}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Comentarios adicionales sobre esta OT..."
                    />
                </CardContent>
            </Card>

            {/* Botones de acción */}
            <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-6 -mb-6">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSubmitting || isLoading
                        ? "Guardando..."
                        : mode === "create"
                        ? "Crear OT"
                        : "Actualizar OT"}
                </Button>
            </div>
        </form>
    );
}

const contenedorPropType = PropTypes.shape({
    numero: PropTypes.string,
});

OTForm.propTypes = {
    defaultValues: PropTypes.oneOfType([
        PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
            numero_ot: PropTypes.string,
            cliente_id: PropTypes.oneOfType([
                PropTypes.number,
                PropTypes.oneOf([null]),
            ]),
            proveedor_id: PropTypes.oneOfType([
                PropTypes.number,
                PropTypes.oneOf([null]),
            ]),
            master_bl: PropTypes.string,
            house_bls: PropTypes.arrayOf(PropTypes.string),
            contenedores: PropTypes.arrayOf(contenedorPropType),
            fecha_eta: PropTypes.string,
            fecha_llegada: PropTypes.string,
            etd: PropTypes.string,
            puerto_origen: PropTypes.string,
            puerto_destino: PropTypes.string,
            operativo: PropTypes.string,
            tipo_embarque: PropTypes.string,
            barco: PropTypes.string,
            estado: PropTypes.string,
            estado_provision: PropTypes.string,
            estado_facturado: PropTypes.string,
            comentarios: PropTypes.string,
            fecha_provision: PropTypes.string,
            express_release_fecha: PropTypes.string,
            contra_entrega_fecha: PropTypes.string,
            envio_cierre_ot: PropTypes.string,
            fecha_solicitud_facturacion: PropTypes.string,
            fecha_recepcion_factura: PropTypes.string,
            provision_source: PropTypes.string,
        }),
        PropTypes.oneOf([null]),
    ]),
    onSubmit: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    isLoading: PropTypes.bool,
    mode: PropTypes.oneOf(["create", "edit"]),
};
