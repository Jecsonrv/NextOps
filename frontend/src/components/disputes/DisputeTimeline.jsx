import { useState } from "react";
import PropTypes from "prop-types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
    MessageSquare,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    FileText,
    Send,
    Loader2,
} from "lucide-react";
import apiClient from "../../lib/api";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { formatDate } from "../../lib/dateUtils";

const EVENT_ICONS = {
    creacion: Clock,
    comentario: MessageSquare,
    actualizacion: FileText,
    resolucion: CheckCircle,
    cierre: XCircle,
    default: AlertTriangle,
};

const EVENT_COLORS = {
    creacion: "bg-blue-100 text-blue-600",
    comentario: "bg-gray-100 text-gray-600",
    actualizacion: "bg-yellow-100 text-yellow-600",
    resolucion: "bg-green-100 text-green-600",
    cierre: "bg-red-100 text-red-600",
    default: "bg-gray-100 text-gray-600",
};

export function DisputeTimeline({ disputeId }) {
    const queryClient = useQueryClient();
    const [newComment, setNewComment] = useState("");

    const { data: eventos, isLoading } = useQuery({
        queryKey: ["dispute-eventos", disputeId],
        queryFn: async () => {
            const response = await apiClient.get(`/invoices/disputes/${disputeId}/eventos/`);
            return response.data;
        },
        enabled: !!disputeId,
    });

    const commentMutation = useMutation({
        mutationFn: async (descripcion) => {
            const response = await apiClient.post(
                `/invoices/disputes/${disputeId}/add_evento/`,
                {
                    tipo: "comentario",
                    descripcion,
                }
            );
            return response.data;
        },
        onSuccess: () => {
            toast.success("Comentario agregado");
            queryClient.invalidateQueries(["dispute-eventos", disputeId]);
            setNewComment("");
        },
        onError: () => {
            toast.error("Error al agregar comentario");
        },
    });

    const handleAddComment = () => {
        if (!newComment.trim()) {
            toast.error("El comentario no puede estar vacío");
            return;
        }
        commentMutation.mutate(newComment);
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-gray-600">Cargando eventos...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Historial de Eventos
                </h3>

                {/* Formulario para agregar comentario */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <label htmlFor="new-comment" className="block text-sm font-medium text-gray-700 mb-2">
                        Agregar Comentario
                    </label>
                    <textarea
                        id="new-comment"
                        rows={3}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Escribe un comentario o actualización sobre la disputa..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                        disabled={commentMutation.isPending}
                    />
                    <div className="flex justify-end">
                        <Button
                            size="sm"
                            onClick={handleAddComment}
                            disabled={commentMutation.isPending || !newComment.trim()}
                        >
                            {commentMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Agregar Comentario
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Timeline de eventos */}
                <div className="space-y-4">
                    {eventos && eventos.length > 0 ? (
                        <div className="relative">
                            {/* Línea vertical del timeline */}
                            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

                            {eventos.map((evento, index) => {
                                const Icon = EVENT_ICONS[evento.tipo] || EVENT_ICONS.default;
                                const colorClass = EVENT_COLORS[evento.tipo] || EVENT_COLORS.default;

                                return (
                                    <div key={evento.id} className="relative flex gap-4 pb-4">
                                        {/* Icono del evento */}
                                        <div
                                            className={`flex-shrink-0 w-12 h-12 rounded-full ${colorClass} flex items-center justify-center z-10 border-4 border-white shadow-sm`}
                                        >
                                            <Icon className="w-5 h-5" />
                                        </div>

                                        {/* Contenido del evento */}
                                        <div className="flex-1 pt-1">
                                            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 capitalize">
                                                            {evento.tipo === "creacion" && "Disputa Creada"}
                                                            {evento.tipo === "comentario" && "Comentario"}
                                                            {evento.tipo === "actualizacion" && "Actualización"}
                                                            {evento.tipo === "resolucion" && "Resolución"}
                                                            {evento.tipo === "cierre" && "Cierre"}
                                                            {!["creacion", "comentario", "actualizacion", "resolucion", "cierre"].includes(evento.tipo) && evento.tipo}
                                                        </h4>
                                                        <p className="text-xs text-gray-500 mt-0.5">
                                                            {evento.usuario} • {formatDate(evento.created_at)}
                                                        </p>
                                                    </div>
                                                    {evento.monto_recuperado && (
                                                        <div className="text-right">
                                                            <div className="text-xs text-gray-500">Monto Recuperado</div>
                                                            <div className="text-lg font-bold text-green-600">
                                                                ${evento.monto_recuperado.toLocaleString("es-MX", {
                                                                    minimumFractionDigits: 2,
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-gray-700 text-sm whitespace-pre-wrap">
                                                    {evento.descripcion}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>No hay eventos registrados</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

DisputeTimeline.propTypes = {
    disputeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};
