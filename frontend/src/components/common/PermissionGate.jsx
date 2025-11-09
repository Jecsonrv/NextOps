import PropTypes from "prop-types";
import { useAuth } from "../../hooks/useAuth";
import { hasAnyRole } from "../../utils/permissions";

/**
 * Componente que renderiza sus hijos solo si el usuario tiene los permisos necesarios.
 *
 * Uso:
 * ```jsx
 * <PermissionGate allowedRoles={["admin", "jefe_operaciones"]}>
 *   <Button>Importar OTs</Button>
 * </PermissionGate>
 * ```
 *
 * El botón solo se mostrará si el usuario es Admin o Jefe de Operaciones.
 */
export function PermissionGate({ children, allowedRoles = [], fallback = null }) {
    const { user } = useAuth();

    // Si no se especifican roles, mostrar siempre (para todos los autenticados)
    if (!allowedRoles || allowedRoles.length === 0) {
        return <>{children}</>;
    }

    // Verificar si el usuario tiene alguno de los roles permitidos
    if (hasAnyRole(user, allowedRoles)) {
        return <>{children}</>;
    }

    // Usuario no tiene permisos, mostrar fallback (por defecto null = no mostrar nada)
    return <>{fallback}</>;
}

PermissionGate.propTypes = {
    children: PropTypes.node.isRequired,
    allowedRoles: PropTypes.arrayOf(PropTypes.string),
    fallback: PropTypes.node,
};

/**
 * Hook personalizado para verificar permisos en componentes funcionales.
 *
 * Uso:
 * ```jsx
 * const { canImport, canEdit, isAdmin } = usePermissions();
 *
 * return (
 *   <div>
 *     {canImport && <Button>Importar</Button>}
 *     {canEdit && <Button>Editar</Button>}
 *   </div>
 * );
 * ```
 */
export function usePermissions() {
    const { user } = useAuth();

    return {
        // Verificaciones de rol específico
        isAdmin: user?.role === "admin",
        isJefeOps: user?.role === "jefe_operaciones",
        isFinanzas: user?.role === "finanzas",
        isOperativo: user?.role === "operativo",

        // Verificaciones de capacidades
        canImport: hasAnyRole(user, ["admin", "jefe_operaciones"]),
        canEditCatalogs: user?.role === "admin",
        canEditFinancialStatus: hasAnyRole(user, ["admin", "finanzas"]),
        canAccessFinance: hasAnyRole(user, ["admin", "finanzas"]),
        canAccessPayments: user?.role === "admin", // Pagos Recibidos - solo admin
        canManageUsers: user?.role === "admin",
        canManageCreditNotes: hasAnyRole(user, ["admin", "finanzas"]), // Notas de Crédito
        canResolveDisputes: hasAnyRole(user, ["admin", "finanzas"]), // Resolver Disputas
        canEditAutomation: user?.role === "admin", // Configuración de Automatización

        // Función helper para verificación personalizada
        hasRole: (roles) => hasAnyRole(user, roles),

        // Información del usuario
        user,
        userRole: user?.role,
    };
}
