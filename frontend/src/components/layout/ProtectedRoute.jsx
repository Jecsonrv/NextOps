import { Navigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../../hooks/useAuth";

export function ProtectedRoute({ children = null, allowedRoles = [] }) {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-sm text-gray-600">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Si se especifican roles, verificar que el usuario tenga uno de ellos
    if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
        // Redirigir a la página principal si el rol no está permitido
        return <Navigate to="/" replace />;
    }

    return children;
}

ProtectedRoute.propTypes = {
    children: PropTypes.node,
    allowedRoles: PropTypes.arrayOf(PropTypes.string),
};
