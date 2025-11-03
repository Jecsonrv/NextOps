import PropTypes from 'prop-types';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import apiClient from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Loader2 } from "lucide-react";

import { useAuth } from "../../hooks/useAuth";

// Esquema para actualizar nombre
const updateNameSchema = z.object({
    full_name: z.string().min(1, "El nombre no puede estar vacío."),
});

// Esquema para actualizar email
const updateEmailSchema = z.object({
    email: z.string().email("Email inválido."),
    current_password: z.string().min(1, "Para guardar cambios, ingresa tu contraseña actual."),
});

// Esquema para cambiar contraseña
const passwordSchema = z.object({
    old_password: z.string().min(1, "Debes ingresar tu contraseña actual."),
    new_password: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
    new_password_confirm: z.string(),
}).refine((data) => data.new_password === data.new_password_confirm, {
    message: "Las nuevas contraseñas no coinciden.",
    path: ["new_password_confirm"],
});

export function PersonalProfileView({ user }) {
    const queryClient = useQueryClient();
    const { setUser } = useAuth();

    // Formulario para actualizar el nombre
    const { 
        register: registerName, 
        handleSubmit: handleSubmitName, 
        reset: resetName, 
        formState: { errors: nameErrors, isDirty: isNameDirty }
    } = useForm({ 
        resolver: zodResolver(updateNameSchema),
        defaultValues: { 
            full_name: user?.full_name || '',
        }
    });

    const updateNameMutation = useMutation({
        mutationFn: (data) => apiClient.patch("/users/me/", data),
        onSuccess: (data) => {
            queryClient.invalidateQueries(['user', 'me']);
            setUser(oldData => ({ ...oldData, ...data }));
            toast.success("Nombre actualizado exitosamente.");
            resetName({ full_name: data.full_name });
        },
        onError: (error) => {
            toast.error(`Error: ${error.message}`);
        }
    });

    const onNameSubmit = (data) => {
        updateNameMutation.mutate(data);
    };

    // Formulario para actualizar el email
    const { 
        register: registerEmail, 
        handleSubmit: handleSubmitEmail, 
        reset: resetEmail, 
        formState: { errors: emailErrors, isDirty: isEmailDirty }
    } = useForm({ 
        resolver: zodResolver(updateEmailSchema),
        defaultValues: { 
            email: user?.email || '',
            current_password: '',
        }
    });

    const updateEmailMutation = useMutation({
        mutationFn: (data) => apiClient.patch("/users/me/", data),
        onSuccess: (data) => {
            queryClient.invalidateQueries(['user', 'me']);
            setUser(oldData => ({ ...oldData, ...data }));
            toast.success("Email actualizado exitosamente.");
            resetEmail({ email: data.email, current_password: '' });
        },
        onError: (error) => {
            const errorMsg = error.response?.data?.current_password?.[0] || error.message;
            toast.error(`Error: ${errorMsg}`);
        }
    });

    const onEmailSubmit = (data) => {
        updateEmailMutation.mutate(data);
    };


    const { 
        register: registerPassword, 
        handleSubmit: handleSubmitPassword, 
        reset: resetPassword, 
        formState: { errors: passwordErrors }
    } = useForm({ resolver: zodResolver(passwordSchema) });

    const changePasswordMutation = useMutation({
        mutationFn: (data) => apiClient.post("/users/me/change-password/", data),
        onSuccess: () => {
            toast.success("Contraseña cambiada exitosamente.");
            resetPassword();
        },
        onError: (error) => {
            const errorMsg = error.response?.data?.old_password?.[0] || error.response?.data?.new_password?.[0] || error.message;
            toast.error(`Error: ${errorMsg}`);
        }
    });

    const onPasswordSubmit = (data) => {
        changePasswordMutation.mutate(data);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-8">
                <Card>
                    <form onSubmit={handleSubmitName(onNameSubmit)}>
                        <CardHeader>
                            <CardTitle>Nombre Completo</CardTitle>
                            <CardDescription>Actualiza tu nombre para mostrar.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Label htmlFor="full_name">Nombre Completo</Label>
                            <Input id="full_name" {...registerName("full_name")} />
                            {nameErrors.full_name && <p className="text-red-500 text-xs mt-1">{nameErrors.full_name.message}</p>}
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={updateNameMutation.isPending || !isNameDirty}>
                                {updateNameMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Guardar Nombre
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <Card>
                    <form onSubmit={handleSubmitEmail(onEmailSubmit)}>
                        <CardHeader>
                            <CardTitle>Correo Electrónico</CardTitle>
                            <CardDescription>Actualiza tu dirección de correo electrónico.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" {...registerEmail("email")} />
                                {emailErrors.email && <p className="text-red-500 text-xs mt-1">{emailErrors.email.message}</p>}
                            </div>
                            <div className="!mt-6 border-t pt-6">
                                <Label htmlFor="current_password_email">Contraseña Actual (para confirmar)</Label>
                                <Input id="current_password_email" type="password" {...registerEmail("current_password")} />
                                {emailErrors.current_password && <p className="text-red-500 text-xs mt-1">{emailErrors.current_password.message}</p>}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={updateEmailMutation.isPending || !isEmailDirty}>
                                {updateEmailMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Guardar Email
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>

            <Card>
                <form onSubmit={handleSubmitPassword(onPasswordSubmit)}>
                    <CardHeader>
                        <CardTitle>Cambiar Contraseña</CardTitle>
                        <CardDescription>Para tu seguridad, elige una contraseña fuerte.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="old_password">Contraseña Actual</Label>
                            <Input id="old_password" type="password" {...registerPassword("old_password")} />
                            {passwordErrors.old_password && <p className="text-red-500 text-xs mt-1">{passwordErrors.old_password.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="new_password">Nueva Contraseña</Label>
                            <Input id="new_password" type="password" {...registerPassword("new_password")} />
                            {passwordErrors.new_password && <p className="text-red-500 text-xs mt-1">{passwordErrors.new_password.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="new_password_confirm">Confirmar Nueva Contraseña</Label>
                            <Input id="new_password_confirm" type="password" {...registerPassword("new_password_confirm")} />
                            {passwordErrors.new_password_confirm && <p className="text-red-500 text-xs mt-1">{passwordErrors.new_password_confirm.message}</p>}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={changePasswordMutation.isPending}>
                            {changePasswordMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Cambiar Contraseña
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

PersonalProfileView.propTypes = {
    user: PropTypes.shape({
        full_name: PropTypes.string,
        email: PropTypes.string,
    }),
};
