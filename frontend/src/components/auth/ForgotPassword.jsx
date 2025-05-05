import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { FaServer } from "@react-icons/all-files/fa/FaServer";
import { FaDesktop } from "@react-icons/all-files/fa/FaDesktop";
import { Alert, AlertDescription } from "../ui/alert";
import { apiService } from "../../services/api";
import hiveiotLogo from "../../visual/hiveiot.svg"

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            // Assuming this endpoint exists, otherwise you'll need to implement it
            await apiService.forgotPassword(email);
            setIsSubmitted(true);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to process request");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/* Logo */}
                {/* Logo - Updated with HiveIoT */}
                <div className="flex items-center justify-center mb-8">
                    <img
                        src={hiveiotLogo}
                        alt="HiveIoT Logo"
                        className="h-24 w-auto drop-shadow-[3px_3px_4px_rgba(0,0,0,0.2)]"
                    />
                </div>

                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Forgot your password?</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {!isSubmitted
                            ? "Enter your email address and we'll send you a link to reset your password."
                            : "Check your email for a link to reset your password."}
                    </p>
                </div>

                {!isSubmitted ? (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="rounded-md shadow-sm -space-y-px">
                            <div>
                                <Label htmlFor="email-address" className="sr-only">
                                    Email address
                                </Label>
                                <Input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                                    placeholder="Email address"
                                />
                            </div>
                        </div>

                        <div>
                            <Button
                                type="submit"
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring"
                            >
                                Send reset link
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="mt-8 space-y-6">
                        <div className="bg-green-50 border border-green-200 rounded-md p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg
                                        className="h-5 w-5 text-green-400"
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        aria-hidden="true"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-green-800">
                                        We've sent a password reset link to <span className="font-bold">{email}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={() => <Navigate to="/login" />}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white text-primary hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        >
                            Return to login
                        </Button>
                    </div>
                )}

                <div className="text-center">
                    <Link to="/login" className="font-medium text-primary hover:text-primary/80">
                        Back to sign in
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;