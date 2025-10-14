import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import apiClient from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/Select";
import { Users, PlusCircle, Edit, Trash2, Search } from "lucide-react";
import { UserFormModal } from "../../components/admin/UserFormModal";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/Dialog";

const fetchUsers = async (filters) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.role) params.append('role', filters.role);
    if (filters.is_active) params.append('is_active', filters.is_active);

    const response = await apiClient.get(`/users/?${params.toString()}`);
    const data = response.data;
    if (Array.isArray(data)) {
        return data;
    }
    return data?.results || [];
};

export function UserManagementPage() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    // Estados para filtros
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const handleRoleChange = (value) => {
        setRoleFilter(value === "__all_roles" ? "" : value);
    };

    const handleStatusChange = (value) => {
        setStatusFilter(value === "__all_status" ? "" : value);
    };

    const { data: users, isLoading, error } = useQuery({ 
        queryKey: ['users', { search: searchTerm, role: roleFilter, is_active: statusFilter }], 
        queryFn: () => fetchUsers({ search: searchTerm, role: roleFilter, is_active: statusFilter }),
        keepPreviousData: true, // Para una experiencia de filtrado más suave
    });

    const mutationOptions = {
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            handleCloseModal();
        },
        onError: (error) => {
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            toast.error(`Error: ${errorMsg}`);
        },
    };

    const createUserMutation = useMutation({
        mutationFn: (userData) => apiClient.post("/users/", userData),
        ...mutationOptions,
        onSuccess: () => {
            toast.success("Usuario creado exitosamente.");
            mutationOptions.onSuccess();
        }
    });

    const updateUserMutation = useMutation({
        mutationFn: ({ id, ...userData }) => apiClient.patch(`/users/${id}/`, userData),
        ...mutationOptions,
        onSuccess: () => {
            toast.success("Usuario actualizado exitosamente.");
            mutationOptions.onSuccess();
        }
    });

    const deleteUserMutation = useMutation({
        mutationFn: (id) => apiClient.delete(`/users/${id}/`),
        onSuccess: () => {
            toast.success("Usuario eliminado exitosamente.");
            queryClient.invalidateQueries(['users']);
            setIsDeleteAlertOpen(false);
            setUserToDelete(null);
        },
        onError: (error) => {
            toast.error(`Error al eliminar usuario: ${error.message}`);
            setIsDeleteAlertOpen(false);
            setUserToDelete(null);
        },
    });

    const handleCreateUser = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const handleEditUser = (user) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
    };

    const handleSaveUser = (data, userId) => {
        if (userId) {
            updateUserMutation.mutate({ id: userId, ...data });
        } else {
            createUserMutation.mutate(data);
        }
    };

    const openDeleteAlert = (user) => {
        setUserToDelete(user);
        setIsDeleteAlertOpen(true);
    };

    const confirmDelete = () => {
        if (userToDelete) {
            deleteUserMutation.mutate(userToDelete.id);
        }
    };

    const getRoleBadgeVariant = (role) => {
        switch (role) {
            case 'admin':
                return 'destructive';
            case 'jefe_operaciones':
                return 'default';
            case 'finanzas':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
                    <p className="text-sm text-gray-500">Crear, editar y administrar cuentas de usuario.</p>
                </div>
                <Button onClick={handleCreateUser}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Crear Usuario
                </Button>
            </div>

            <Card>
                <CardHeader className="!p-4 border-b">
                    <div className="flex items-center justify-between gap-4">
                         <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input 
                                placeholder="Buscar por nombre o email..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Select
                                value={roleFilter || "__all_roles"}
                                onValueChange={handleRoleChange}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filtrar por Rol" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all_roles">Todos los Roles</SelectItem>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                    <SelectItem value="jefe_operaciones">Jefe de Operaciones</SelectItem>
                                    <SelectItem value="finanzas">Finanzas</SelectItem>
                                    <SelectItem value="operativo">Operativo</SelectItem>
                                </SelectContent>
                            </Select>
                             <Select
                                value={statusFilter || "__all_status"}
                                onValueChange={handleStatusChange}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filtrar por Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all_status">Todos los Estados</SelectItem>
                                    <SelectItem value="true">Activo</SelectItem>
                                    <SelectItem value="false">Inactivo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading && <p className="p-4">Cargando usuarios...</p>}
                    {error && <p className="p-4 text-red-500">Error al cargar usuarios: {error.message}</p>}
                    {users && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead>Nombre Completo</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Rol</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length > 0 ? (
                                    users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.username}</TableCell>
                                            <TableCell>{user.full_name}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                <Badge variant={getRoleBadgeVariant(user.role)}>
                                                    {user.role_display}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.is_active ? 'success' : 'secondary'}>
                                                    {user.is_active ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="space-x-2">
                                                <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="destructive" size="sm" onClick={() => openDeleteAlert(user)}><Trash2 className="h-4 w-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24">
                                            No se encontraron usuarios con los filtros actuales.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <UserFormModal 
                isOpen={isModalOpen} 
                onClose={handleCloseModal} 
                onSave={handleSaveUser} 
                user={selectedUser}
                isSaving={createUserMutation.isPending || updateUserMutation.isPending}
            />

            <Dialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Estás seguro?</DialogTitle>
                        <DialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario <span className="font-bold">{userToDelete?.username}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-4 flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsDeleteAlertOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Eliminar</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}