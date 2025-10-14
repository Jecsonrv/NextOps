import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/Select";
import { Switch } from "../ui/Switch";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/Avatar";

import { Loader2 } from "lucide-react";

const getInitials = (name = "") => {
    if (!name) return "?";
    const nameParts = name.split(" ");
    if (nameParts.length > 1) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
};

const roleDisplayNames = {
    admin: "Administrador",
    jefe_operaciones: "Jefe de Operaciones",
    finanzas: "Finanzas",
    operativo: "Operativo",
};
const userSchema = z.object({
    username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres."),
    email: z.string().email("Email inválido."),
    full_name: z.string().optional(),
    role: z.enum(['admin', 'jefe_operaciones', 'finanzas', 'operativo']),
    is_active: z.boolean().default(true),
    password: z.string().optional(),
});

export function UserFormModal({ user, isOpen, onClose, onSave, isSaving }) {
    const isEditMode = !!user;

    const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
        resolver: zodResolver(userSchema),
        defaultValues: {
            username: '',
            email: '',
            full_name: '',
            role: 'operativo',
            is_active: true,
            password: '',
        }
    });

    useEffect(() => {
        if (isEditMode && user) {
            reset({
                username: user.username,
                email: user.email,
                full_name: user.full_name || '',
                role: user.role,
                is_active: user.is_active,
                password: '',
            });
        } else {
            reset({
                username: '',
                email: '',
                full_name: '',
                role: 'operativo',
                is_active: true,
                password: '',
            });
        }
    }, [user, isEditMode, reset]);

    const onSubmit = (data) => {
        // No enviar la contraseña si está vacía en modo edición
        if (isEditMode && !data.password) {
            delete data.password;
        }
        onSave(data, user?.id);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] p-6">
                <DialogHeader>
                    <DialogTitle className="text-2xl">{isEditMode ? "Editar Usuario" : "Crear Nuevo Usuario"}</DialogTitle>
                    <p className="text-sm text-gray-500">
                        {isEditMode ? `Actualizando el perfil de ${user.username}` : "Rellena los detalles para crear un nuevo usuario."}
                    </p>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">Usuario</Label>
                                <Input id="username" {...register("username")} />
                                {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Nombre Completo</Label>
                                <Input id="full_name" {...register("full_name")} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" {...register("email")} />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input id="password" type="password" {...register("password")} placeholder={isEditMode ? "Dejar en blanco para no cambiar" : ""} />
                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4 items-center">
                            <div className="space-y-2">
                                <Label htmlFor="role">Rol</Label>
                                <Controller
                                    name="role"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar rol..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(roleDisplayNames).map(([value, label]) => (
                                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="flex items-center space-x-3 pt-6">
                                <Controller
                                    name="is_active"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch
                                            id="is_active"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
                                />
                                <Label htmlFor="is_active" className="text-sm font-medium">Usuario Activo</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="pt-6">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEditMode ? "Guardar Cambios" : "Crear Usuario")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

UserFormModal.propTypes = {
    user: PropTypes.object,
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    isSaving: PropTypes.bool.isRequired,
};