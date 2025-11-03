import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

const roleDisplayNames = {
    admin: "Administrador",
    jefe_operaciones: "Jefe de Operaciones",
    finanzas: "Finanzas",
    operativo: "Operativo",
};

export function AdminProfileView({ user }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Información del Usuario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between">
                    <span className="font-medium">Nombre de Usuario</span>
                    <span>{user.username}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-medium">Nombre Completo</span>
                    <span>{user.full_name}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-medium">Email</span>
                    <span>{user.email}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-medium">Rol</span>
                    <Badge>{roleDisplayNames[user.role] || user.role}</Badge>
                </div>
                <div className="flex justify-between">
                    <span className="font-medium">Estado</span>
                    <Badge variant={user.is_active ? 'success' : 'secondary'}>
                        {user.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                </div>
                <div className="flex justify-between">
                    <span className="font-medium">Miembro desde</span>
                    <span>{new Date(user.date_joined).toLocaleDateString()}</span>
                </div>
            </CardContent>
        </Card>
    );
}

AdminProfileView.propTypes = {
    user: PropTypes.shape({
        username: PropTypes.string,
        full_name: PropTypes.string,
        email: PropTypes.string,
        role: PropTypes.string,
        is_active: PropTypes.bool,
        date_joined: PropTypes.string,
    }).isRequired,
};
