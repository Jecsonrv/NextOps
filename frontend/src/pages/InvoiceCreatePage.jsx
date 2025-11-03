import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import apiClient from "../../lib/api";
import { InvoiceCreateForm } from "../../components/invoices/InvoiceCreateForm";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export function InvoiceCreatePage() {
    const navigate = useNavigate();

    const createInvoiceMutation = useMutation({
        mutationFn: async (newInvoiceData) => {
            const formData = new FormData();
            for (const key in newInvoiceData) {
                if (key === 'file' && newInvoiceData[key][0]) {
                    formData.append(key, newInvoiceData[key][0]);
                } else if (newInvoiceData[key] !== undefined && newInvoiceData[key] !== null) {
                    formData.append(key, newInvoiceData[key]);
                }
            }
            const response = await apiClient.post("/invoices/", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        },
        onSuccess: (data) => {
            toast.success("Factura creada exitosamente.");
            navigate(`/invoices/${data.id}`);
        },
        onError: (err) => {
            console.error("Error al crear factura:", err);
            toast.error("Error al crear factura.", {
                description:
                    err.response?.data?.detail ||
                    err.response?.data?.file?.[0] || // Specific file error
                    "Hubo un problema al procesar tu solicitud.",
            });
            // Display field-specific errors if available
            if (err.response?.data) {
                for (const key in err.response.data) {
                    if (Array.isArray(err.response.data[key])) {
                        toast.error(`${key}: ${err.response.data[key].join(', ')}`);
                    } else if (typeof err.response.data[key] === 'string') {
                        toast.error(`${key}: ${err.response.data[key]}`);
                    }
                }
            }
        },
    });

    const onSubmit = (data) => {
        createInvoiceMutation.mutate(data);
    };

    return (
        <div className="space-y-6">
            <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2"
            >
                <ArrowLeft className="h-4 w-4" />
                Volver
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>Crear Nueva Factura</CardTitle>
                    <CardDescription>
                        Ingresa los detalles para una nueva factura.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <InvoiceCreateForm onSubmit={onSubmit} />
                </CardContent>
            </Card>
        </div>
    );
}