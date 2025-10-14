import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import apiClient from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { Avatar, AvatarFallback } from "../components/ui/Avatar";
import { Loader2, UserCircle } from "lucide-react";

// Esquema para actualizar perfil
const profileSchema = z.object({
    full_name: z.string().min(1, "El nombre no puede estar vacío."),
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

// Helper para obtener iniciales
const getInitials = (name = "") => {
    const names = name.split(' ');
    if (names.length === 1 && names[0]) return names[0][0].toUpperCase();
    if (names.length > 1) return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    return <UserCircle />;
};

export function ProfilePage() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const { data: profileData, isLoading: isLoadingProfile } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            const response = await apiClient.get("/users/me/");
            return response.data;
        },
        enabled: !!user?.id,
    });

    const { 
        register: registerProfile, 
        handleSubmit: handleSubmitProfile, 
        reset: resetProfile, 
        formState: { errors: profileErrors, isDirty: isProfileDirty }
    } = useForm({ 
        resolver: zodResolver(profileSchema),
        values: { 
            full_name: profileData?.full_name || '',
            email: profileData?.email || '',
            current_password: '',
        }
    });

    const updateProfileMutation = useMutation({
        mutationFn: (data) => apiClient.patch("/users/me/", data),
        onSuccess: (data) => {
            queryClient.setQueryData(['profile', user?.id], data);
            toast.success("Perfil actualizado exitosamente.");
            resetProfile({ ...data, current_password: '' });
        },
        onError: (error) => {
            const errorMsg = error.response?.data?.current_password?.[0] || error.message;
            toast.error(`Error: ${errorMsg}`);
        }
    });

    const onProfileSubmit = (data) => {
        updateProfileMutation.mutate(data);
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

    if (isLoadingProfile) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 text-2xl">
                    <AvatarFallback>{getInitials(profileData?.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{profileData?.full_name}</h1>
                    <p className="text-md text-gray-500">@{profileData?.username} &middot; <span className="font-medium">{profileData?.role_display}</span></p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Columna de Perfil */}
                <Card>
                    <form onSubmit={handleSubmitProfile(onProfileSubmit)}>
                        <CardHeader>
                            <CardTitle>Información Personal</CardTitle>
                            <CardDescription>Actualiza tu nombre y correo electrónico.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="full_name">Nombre Completo</Label>
                                <Input id="full_name" {...registerProfile("full_name")} />
                                {profileErrors.full_name && <p className="text-red-500 text-xs mt-1">{profileErrors.full_name.message}</p>}
                            </div>
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" {...registerProfile("email")} />
                                {profileErrors.email && <p className="text-red-500 text-xs mt-1">{profileErrors.email.message}</p>}
                            </div>
                            <div className="!mt-6 border-t pt-6">
                                <Label htmlFor="current_password">Contraseña Actual (para confirmar)</Label>
                                <Input id="current_password" type="password" {...registerProfile("current_password")} />
                                {profileErrors.current_password && <p className="text-red-500 text-xs mt-1">{profileErrors.current_password.message}</p>}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={updateProfileMutation.isPending || !isProfileDirty}>
                                {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Guardar Cambios
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                {/* Columna de Contraseña */}
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
        </div>
    );
}
