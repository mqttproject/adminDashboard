import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import Login from "./components/auth/Login";
import SignUp from "./components/auth/SignUp";
import ForgotPassword from "./components/auth/ForgotPassword";
import { useAuth } from "./context/AuthContext";
import LoadingScreen from "./components/LoadingScreen"; // Create this component

// Protected route component
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, authLoading } = useAuth();

    // Show loading screen while checking authentication
    if (authLoading) {
        return <LoadingScreen />;
    }

    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

// Public route component (redirects to dashboard if logged in)
const PublicRoute = ({ children }) => {
    const { isAuthenticated, authLoading } = useAuth();

    // Show loading screen while checking authentication
    if (authLoading) {
        return <LoadingScreen />;
    }

    if (isAuthenticated()) {
        return <Navigate to="/" replace />;
    }

    return children;
};

// Create router
export const router = createBrowserRouter([
    {
        path: "/",
        element: (
            <ProtectedRoute>
                <App />
            </ProtectedRoute>
        ),
    },
    {
        path: "/login",
        element: (
            <PublicRoute>
                <Login />
            </PublicRoute>
        ),
    },
    {
        path: "/signup",
        element: (
            <PublicRoute>
                <SignUp />
            </PublicRoute>
        ),
    },
    {
        path: "/forgot-password",
        element: (
            <PublicRoute>
                <ForgotPassword />
            </PublicRoute>
        ),
    },
]);