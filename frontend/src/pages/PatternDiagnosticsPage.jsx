import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { AlertCircle, CheckCircle, RefreshCw, Search } from "lucide-react";
import toast from "react-hot-toast";

// Configurar la URL base del API
const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export default function PatternDiagnosticsPage() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [searchProvider, setSearchProvider] = useState("");

    const fetchDiagnostics = async (providerName = "") => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem("access_token");
            const url = providerName
                ? `${API_BASE_URL}/patterns/diagnostics/?provider=${encodeURIComponent(
                      providerName
                  )}`
                : `${API_BASE_URL}/patterns/diagnostics/`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `Error al cargar diagnóstico: ${response.status} - ${errorText}`
                );
            }

            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err.message);
            toast.error(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const activarPatrones = async (providerId, providerName) => {
        if (
            !confirm(
                `¿Activar todos los patrones inactivos de ${providerName}?`
            )
        ) {
            return;
        }

        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(
                `${API_BASE_URL}/patterns/diagnostics/activate/${providerId}/`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Error al activar patrones");
            }

            const result = await response.json();
            toast.success(result.message);
            fetchDiagnostics();
        } catch (err) {
            toast.error(`Error: ${err.message}`);
        }
    };

    useEffect(() => {
        fetchDiagnostics();
    }, []);

    const handleSearch = () => {
        fetchDiagnostics(searchProvider);
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">
                        Diagnóstico de Patrones
                    </h1>
                    <p className="text-muted-foreground">
                        Verificación de patrones regex para proveedores
                    </p>
                </div>
                <Button onClick={() => fetchDiagnostics()} disabled={loading}>
                    <RefreshCw
                        className={`h-4 w-4 mr-2 ${
                            loading ? "animate-spin" : ""
                        }`}
                    />
                    Actualizar
                </Button>
            </div>

            {/* Búsqueda */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Buscar proveedor (ej: CMA CGM)..."
                            value={searchProvider}
                            onChange={(e) => setSearchProvider(e.target.value)}
                            onKeyPress={(e) =>
                                e.key === "Enter" && handleSearch()
                            }
                        />
                        <Button onClick={handleSearch}>
                            <Search className="h-4 w-4 mr-2" />
                            Buscar
                        </Button>
                        {searchProvider && (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearchProvider("");
                                    fetchDiagnostics();
                                }}
                            >
                                Limpiar
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Error */}
            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-red-700">
                            <AlertCircle className="h-5 w-5" />
                            <p className="font-medium">{error}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Estadísticas */}
            {data && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">
                                Proveedores Activos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {data.total_providers}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">
                                Patrones Activos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {data.total_patterns}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">
                                Campos Objetivo
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {data.total_fields}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Lista de Proveedores */}
            {data && data.providers && (
                <div className="space-y-4">
                    {data.providers.map((provider) => (
                        <Card key={provider.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            {provider.nombre}
                                            {provider.patrones_count > 0 ? (
                                                <CheckCircle className="h-5 w-5 text-green-500" />
                                            ) : (
                                                <AlertCircle className="h-5 w-5 text-red-500" />
                                            )}
                                        </CardTitle>
                                        <CardDescription>
                                            ID: {provider.id} | Tipo:{" "}
                                            {provider.tipo}
                                        </CardDescription>
                                    </div>
                                    <Badge
                                        variant={
                                            provider.patrones_count > 0
                                                ? "success"
                                                : "destructive"
                                        }
                                    >
                                        {provider.patrones_count} patrones
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {provider.patrones_count === 0 ? (
                                    <Card className="border-yellow-200 bg-yellow-50">
                                        <CardContent className="pt-4">
                                            <div className="flex items-start gap-2 text-yellow-700">
                                                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                                <p className="text-sm">
                                                    Este proveedor no tiene
                                                    patrones activos. Las
                                                    facturas de este proveedor
                                                    requerirán captura manual.
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="text-sm font-semibold text-muted-foreground mb-2">
                                            Patrones Activos:
                                        </div>
                                        {provider.patrones.map((pattern) => (
                                            <div
                                                key={pattern.id}
                                                className="border rounded-lg p-3 space-y-2 bg-muted/30"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="font-medium">
                                                        {pattern.name}
                                                    </div>
                                                    <Badge variant="outline">
                                                        Prioridad:{" "}
                                                        {pattern.priority}
                                                    </Badge>
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    Campo:{" "}
                                                    <span className="font-mono">
                                                        {pattern.field_name}
                                                    </span>{" "}
                                                    ({pattern.field_code})
                                                </div>
                                                <div className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto">
                                                    {pattern.pattern_preview}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {data && data.providers.length === 0 && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-blue-700">
                            <AlertCircle className="h-5 w-5" />
                            <p>
                                {searchProvider
                                    ? `No se encontró ningún proveedor con el nombre "${searchProvider}"`
                                    : "No hay proveedores registrados en el sistema"}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
