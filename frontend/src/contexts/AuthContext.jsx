import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import apiClient from "../lib/api";
import { AuthContext } from "./authContextInstance";

export const AuthProvider = ({ children = null }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem("access_token");

        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const { data } = await apiClient.get("/auth/me/");
            setUser(data);
        } catch (error) {
            console.error("Auth check failed:", error);
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            // Backend expects 'username' field, but we use email as username
            const { data } = await apiClient.post("/auth/login/", {
                username: email, // Send email as username
                password,
            });

            localStorage.setItem("access_token", data.access);
            localStorage.setItem("refresh_token", data.refresh);

            const { data: userData } = await apiClient.get("/auth/me/");
            setUser(userData);

            return data;
        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setUser(null);
    };

    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
};

AuthProvider.propTypes = {
    children: PropTypes.node,
};
