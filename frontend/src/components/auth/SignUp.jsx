import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { FaServer } from "@react-icons/all-files/fa/FaServer";
import { FaDesktop } from "@react-icons/all-files/fa/FaDesktop";
import { Alert, AlertDescription } from "../ui/alert";
import { Separator } from "../ui/separator";
import { Checkbox } from "../ui/checkbox";
import { FaGoogle } from "@react-icons/all-files/fa/FaGoogle";
import { FaApple } from "@react-icons/all-files/fa/FaApple";
import { FaFacebook } from "@react-icons/all-files/fa/FaFacebook";
import hiveiotLogo from "../../visual/hiveiot.svg";

const SignUp = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(false)
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsLoading(true);

        try {
            await register(username, password);
            navigate("/");
        } catch (err) {
            setError(err.response?.data?.error || "Failed to create account");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-16">
                <div className="w-full max-w-md">
                    {/* Logo - Updated with HiveIoT */}
                    <div className="flex items-center justify-center mb-8">
                        <img
                            src={hiveiotLogo}
                            alt="HiveIoT Logo"
                            className="h-24 w-auto drop-shadow-[3px_3px_4px_rgba(0,0,0,0.2)]"
                        />
                    </div>

                    {/* Heading */}
                    <h1 className="text-3xl font-bold text-center mb-2">Create an Account</h1>
                    <p className="text-gray-500 text-center mb-8">Please enter your details to sign up</p>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Username
                            </Label>
                            <Input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Enter your username"
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm Password
                            </Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <div className="flex items-center">
                            <Input
                                id="agree-terms"
                                type="checkbox"
                                checked={agreeTerms}
                                onChange={(e) => setAgreeTerms(e.target.checked)}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                required
                            />
                            <Label htmlFor="agree-terms" className="ml-2 block text-sm text-gray-700">
                                I agree to the{" "}
                                <Link to="/terms" className="font-medium text-primary hover:text-primary/80">
                                    Terms of Service
                                </Link>{" "}
                                and{" "}
                                <Link to="/privacy" className="font-medium text-primary hover:text-primary/80">
                                    Privacy Policy
                                </Link>
                            </Label>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Creating Account..." : "Create Account"}
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <Separator className="w-full" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <Button type="button" variant="outline" className="flex justify-center items-center">
                                <FaGoogle className="text-red-500" />
                            </Button>
                            <Button type="button" variant="outline" className="flex justify-center items-center">
                                <FaApple className="text-foreground" />
                            </Button>
                            <Button type="button" variant="outline" className="flex justify-center items-center">
                                <FaFacebook className="text-blue-600" />
                            </Button>
                        </div>

                        <div className="text-center">
                            <p className="text-sm text-gray-600">
                                Already have an account?{" "}
                                <Link to="/login" className="font-medium text-primary hover:text-primary/80">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
            {/* Right side - Image */}
            <div className="hidden lg:block lg:w-1/2 bg-primary">
                <div className="h-full flex flex-col justify-center items-center text-white p-12">
                    <div className="max-w-md">
                        <h2 className="text-3xl font-bold mb-6">Join the HiveIoT community</h2>
                        <p className="text-lg mb-8">
                            Create an account to access powerful tools for managing and monitoring your IoT device simulators.
                        </p>
                        <Card className="bg-white/10 rounded-lg backdrop-blur-sm border-0">
                            <CardContent className="p-6 text-white" >
                                <p className="italic mb-4">
                                    "Setting up HiveIoT was incredibly easy. Within minutes, I had all my simulators connected and was able
                                    to monitor them in real-time."
                                </p>
                                <div className="flex items-center">
                                    <div className="w-10 h-10 bg-purple-400 rounded-full"></div>
                                    <div className="ml-3">
                                        <p className="font-medium">Michael Chen</p>
                                        <p className="text-sm opacity-75">DevOps Lead, IoT Solutions</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUp;