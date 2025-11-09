import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../components/ui/Card";

export function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await login(email, password);
            navigate("/");
        } catch (err) {
            console.error("Login error:", err);

            // Manejar diferentes tipos de errores con mensajes amigables
            let errorMsg = "Error al iniciar sesión. Por favor, intenta nuevamente.";

            if (err.response) {
                const status = err.response.status;
                const data = err.response.data;

                if (status === 401) {
                    // Credenciales incorrectas
                    errorMsg = "Usuario o contraseña incorrectos. Por favor, verifica tus credenciales.";
                } else if (status === 400) {
                    // Error de validación
                    if (data.detail) {
                        errorMsg = data.detail;
                    } else if (data.non_field_errors) {
                        errorMsg = Array.isArray(data.non_field_errors)
                            ? data.non_field_errors[0]
                            : data.non_field_errors;
                    } else {
                        errorMsg = "Datos de inicio de sesión inválidos.";
                    }
                } else if (status >= 500) {
                    // Error del servidor
                    errorMsg = "Error en el servidor. Por favor, contacta al administrador del sistema.";
                } else if (status === 403) {
                    // Usuario inactivo o sin permisos
                    errorMsg = "Tu cuenta está inactiva. Contacta al administrador.";
                }
            } else if (err.request) {
                // No se recibió respuesta del servidor
                errorMsg = "No se pudo conectar con el servidor. Verifica tu conexión a internet.";
            }

            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-2 text-center">
                    <div className="flex justify-center mb-2">
                        <img
                            src="/nextops-logo.svg"
                            alt="NextOps"
                            className="h-20 w-auto"
                        />
                    </div>
                    <CardDescription>
                        Sistema de Gestión de Operaciones y Facturación
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label
                                htmlFor="email"
                                className="text-sm font-medium text-gray-700"
                            >
                                Usuario o Email
                            </label>
                            <Input
                                id="email"
                                type="text"
                                placeholder="Ingresa tu usuario o email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                                autoComplete="username"
                            />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="password"
                                className="text-sm font-medium text-gray-700"
                            >
                                Contraseña
                            </label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Ingresa tu contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                                autoComplete="current-password"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
