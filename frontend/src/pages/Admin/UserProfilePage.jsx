import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import apiClient from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Avatar, AvatarFallback } from "../../components/ui/Avatar";
import { Loader2, UserCircle } from "lucide-react";
import { useParams } from "react-router-dom";
import { PersonalProfileView } from "../../components/admin/PersonalProfileView";
import { AdminProfileView } from "../../components/admin/AdminProfileView";
import { UserActivityTab } from "../../components/admin/UserActivityTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/Tabs";

// Esquema para actualizar perfil
const profileSchema = z.object({
    full_name: z.string().min(1, "El nombre no puede estar vacío."),
    email: z.string().email("Email inválido."),
});

// Helper para obtener iniciales
const getInitials = (name = "") => {
    const names = name.split(' ');
    if (names.length === 1 && names[0]) return names[0][0].toUpperCase();
    if (names.length > 1) return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    return <UserCircle />;
};

export function UserProfilePage() {
    const { userId } = useParams();
    const queryClient = useQueryClient();
    const { user: loggedInUser } = useAuth();

    useEffect(() => {
        queryClient.invalidateQueries(['user', userId || 'me']);
    }, [userId, queryClient]);

    const { data: user, isLoading: isLoadingUser } = useQuery({
        queryKey: ['user', userId || 'me'],
        queryFn: async () => {
            const response = await apiClient.get(userId ? `/users/${userId}/` : '/users/me/');
            return response.data;
        },
        enabled: !!loggedInUser,
    });

    if (isLoadingUser) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!user) {
        return <div className="text-center py-10">Usuario no encontrado.</div>;
    }

    const isOwnProfile = loggedInUser?.id === user.id;

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 text-2xl">
                    <AvatarFallback>{getInitials(user?.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{user?.full_name}</h1>
                    <p className="text-md text-gray-500">@{user?.username} &middot; <span className="font-medium">{user?.role_display}</span></p>
                </div>
            </div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList>
                    <TabsTrigger value="profile">Perfil</TabsTrigger>
                    <TabsTrigger value="activity">Actividad</TabsTrigger>
                </TabsList>
                <TabsContent value="profile">
                    {isOwnProfile ? (
                        <PersonalProfileView user={user} key={user.id} />
                    ) : (
                        <AdminProfileView user={user} key={user.id} />
                    )}
                </TabsContent>
                <TabsContent value="activity">
                    <UserActivityTab userId={user.id} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
