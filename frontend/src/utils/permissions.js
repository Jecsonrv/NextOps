/**
 * Utilidades para verificar permisos de usuario según el rol.
 *
 * Roles del sistema:
 * - admin: Control total
 * - jefe_operaciones: Importación + permisos operativos
 * - finanzas: Gestión financiera y CRM (excepto Pagos Recibidos)
 * - operativo: Solo lectura
 */

/**
 * Verifica si el usuario tiene alguno de los roles especificados
 * @param {object} user - Objeto del usuario autenticado
 * @param {string[]} allowedRoles - Array de roles permitidos
 * @returns {boolean}
 */
export const hasAnyRole = (user, allowedRoles) => {
  if (!user || !user.role) return false;
  return allowedRoles.includes(user.role);
};

/**
 * Verifica si el usuario es Admin
 * @param {object} user
 * @returns {boolean}
 */
export const isAdmin = (user) => {
  return user?.role === 'admin';
};

/**
 * Verifica si el usuario es Admin o Jefe de Operaciones
 * @param {object} user
 * @returns {boolean}
 */
export const canImportData = (user) => {
  return hasAnyRole(user, ['admin', 'jefe_operaciones']);
};

/**
 * Verifica si el usuario es Admin o Finanzas
 * @param {object} user
 * @returns {boolean}
 */
export const canAccessFinance = (user) => {
  return hasAnyRole(user, ['admin', 'finanzas']);
};

/**
 * Verifica si puede acceder a Pagos Recibidos (solo Admin)
 * @param {object} user
 * @returns {boolean}
 */
export const canAccessSalesPayments = (user) => {
  return isAdmin(user);
};

/**
 * Verifica si puede editar catálogos (solo Admin)
 * @param {object} user
 * @returns {boolean}
 */
export const canEditCatalogs = (user) => {
  return isAdmin(user);
};

/**
 * Verifica si puede editar campos financieros (Admin o Finanzas)
 * @param {object} user
 * @returns {boolean}
 */
export const canEditFinancialStatus = (user) => {
  return hasAnyRole(user, ['admin', 'finanzas']);
};

/**
 * Verifica si un item del menú debe ser visible para el usuario
 * @param {object} user
 * @param {object} menuItem - Item del menú con propiedad opcional `roles`
 * @returns {boolean}
 */
export const canViewMenuItem = (user, menuItem) => {
  // Si no se especifican roles, es visible para todos
  if (!menuItem.roles || menuItem.roles.length === 0) {
    return true;
  }

  // Verificar si el usuario tiene algún rol permitido
  return hasAnyRole(user, menuItem.roles);
};

/**
 * Filtra items del menú según permisos del usuario
 * @param {object} user
 * @param {array} menuItems - Array de items del menú
 * @returns {array} - Items filtrados
 */
export const filterMenuItems = (user, menuItems) => {
  return menuItems
    .map((item) => {
      // Si el item tiene hijos, filtrarlos recursivamente
      if (item.children) {
        const filteredChildren = item.children.filter((child) =>
          canViewMenuItem(user, child)
        );

        // Si no quedan hijos después del filtrado, ocultar el padre
        if (filteredChildren.length === 0) {
          return null;
        }

        return {
          ...item,
          children: filteredChildren,
        };
      }

      // Item sin hijos, verificar permisos directamente
      return canViewMenuItem(user, item) ? item : null;
    })
    .filter(Boolean); // Eliminar items null
};
