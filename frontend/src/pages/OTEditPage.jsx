import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/api";
import { OTForm } from "../components/OTForm";
import { Button } from "../components/ui/Button";
import { ArrowLeft, Loader2 } from "lucide-react";

export function OTEditPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Cargar datos de la OT
    const {
        data: ot,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["ot", id],
        enabled: Boolean(id),
        queryFn: async () => {
            const response = await apiClient.get(`/ots/${id}/`);
            return response.data;
        },
    });

    // Transformar datos para el formulario (referencia estable)
    const defaultValues = useMemo(() => {
        if (!ot) {
            return null;
        }

        const asDateInput = (value) => (value ? value : "");
        const asString = (value, fallback = "") =>
            value === null || value === undefined ? fallback : String(value);

        const normalizedContenedores = Array.isArray(ot.contenedores)
            ? ot.contenedores.map((item) => ({
                  numero: asString(
                      typeof item === "string" ? item : item?.numero,
                      ""
                  ),
              }))
            : [];

        const normalizedProvisionItems = Array.isArray(ot.provision_items)
            ? ot.provision_items.map((item) => ({
                  concepto: asString(item?.concepto, ""),
                  monto:
                      item?.monto === null || item?.monto === undefined
                          ? 0
                          : Number(item.monto),
                  moneda: asString(item?.moneda, "USD"),
                  descripcion: asString(item?.descripcion, ""),
              }))
            : [];

        return {
            id: ot.id,
            numero_ot: asString(ot.numero_ot, ""),
            cliente_id:
                ot.cliente && typeof ot.cliente.id !== "undefined"
                    ? Number(ot.cliente.id)
                    : null,
            proveedor_id:
                ot.proveedor && typeof ot.proveedor.id !== "undefined"
                    ? Number(ot.proveedor.id)
                    : null,
            master_bl: asString(ot.master_bl, ""),
            house_bls: Array.isArray(ot.house_bls) ? [...ot.house_bls] : [],
            contenedores: normalizedContenedores,
            provision_items: normalizedProvisionItems,
            fecha_eta: asDateInput(ot.fecha_eta),
            fecha_llegada: asDateInput(ot.fecha_llegada),
            etd: asDateInput(ot.etd),
            puerto_origen: asString(ot.puerto_origen, ""),
            puerto_destino: asString(ot.puerto_destino, ""),
            operativo: asString(ot.operativo, ""),
            tipo_embarque: asString(ot.tipo_embarque, ""),
            barco: asString(ot.barco, ""),
            estado: asString(ot.estado || "transito"),
            estado_provision: asString(ot.estado_provision || "pendiente"),
            estado_facturado: asString(ot.estado_facturado || "pendiente"),
            tipo_operacion: asString(ot.tipo_operacion || "importacion"),
            comentarios: asString(ot.comentarios, ""),
            notas: asString(ot.notas, ""),
            fecha_provision: asDateInput(ot.fecha_provision),
            provision_source: asString(ot.provision_source || "manual"),
            provision_locked: Boolean(ot.provision_locked),
            fecha_solicitud_facturacion: asDateInput(
                ot.fecha_solicitud_facturacion
            ),
            fecha_recepcion_factura: asDateInput(ot.fecha_recepcion_factura),
            express_release_fecha: asDateInput(ot.express_release_fecha),
            contra_entrega_fecha: asDateInput(ot.contra_entrega_fecha),
            express_release_tipo: asString(ot.express_release_tipo, ""),
            contra_entrega_tipo: asString(ot.contra_entrega_tipo, ""),
            envio_cierre_ot: asDateInput(ot.envio_cierre_ot),
            provision_hierarchy: ot.provision_hierarchy || {},
            cliente: ot.cliente || null,
            proveedor: ot.proveedor || null,
            modificado_por: ot.modificado_por || null,
        };
    }, [ot]);

    // Mutation para actualizar OT
    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const response = await apiClient.patch(`/ots/${id}/`, data);
            return response.data;
        },
        onSuccess: (data) => {
            // Invalidar cache
            queryClient.invalidateQueries(["ots"]);
            queryClient.invalidateQueries(["ot", id]);
            // Mostrar mensaje de éxito
            alert(`OT ${data.numero_ot} actualizada exitosamente`);
            // Redirigir al detalle
            navigate(`/ots/${data.id}`);
        },
        onError: (error) => {
            console.error("Error al actualizar OT:", error);
            const errorMessage =
                error.response?.data?.detail ||
                error.response?.data?.message ||
                JSON.stringify(error.response?.data) ||
                error.message ||
                "Error desconocido al actualizar OT";
            alert(`Error al actualizar OT: ${errorMessage}`);
        },
    });

    const handleSubmit = (data) => {
        updateMutation.mutate(data);
    };

    const handleCancel = () => {
        if (window.confirm("¿Descartar los cambios y volver?")) {
            navigate(`/ots/${id}`);
        }
    };

    // Estados de carga y error
    if (isLoading || !defaultValues) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
                    <p className="text-gray-500">Cargando OT...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-red-500 mb-4">Error al cargar la OT</p>
                    <Button onClick={() => navigate("/ots")}>
                        Volver a la lista
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/ots/${id}`)}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Editar OT: {ot.numero_ot}
                        </h1>
                        <p className="text-sm text-gray-500">
                            Modifique los campos necesarios y guarde los cambios
                        </p>
                    </div>
                </div>
            </div>

            {/* Formulario */}
            <div className="max-w-7xl">
                <OTForm
                    mode="edit"
                    defaultValues={defaultValues}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    isLoading={updateMutation.isPending}
                />
            </div>
        </div>
    );
}

/**
 * Página para importar OTs desde archivos Excel
 * Soporta múltiples archivos simultáneos y resolución de conflictos
 */
