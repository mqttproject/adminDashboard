import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { FaGoogle } from "@react-icons/all-files/fa/FaGoogle";
import { FaApple } from "@react-icons/all-files/fa/FaApple";
import { FaFacebook } from "@react-icons/all-files/fa/FaFacebook";
import { Separator } from "../ui/separator";
import { Checkbox } from "../ui/checkbox";
import { Alert, AlertDescription } from "../ui/alert";
// Import the HiveIoT logo
import hiveiotLogo from "../../visual/hiveiot.svg";

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [rememberMe, setRememberMe] = useState(false)
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            await login(username, password);
            navigate("/");
        } catch (err) {
            setError(err.response?.data?.error || "Failed to login");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            {/* Left side - Form */}
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
                    <h1 className="text-3xl font-bold text-center mb-2">Welcome Back</h1>
                    <p className="text-muted-foreground text-center mb-8">Please enter your details to login</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="remember-me"
                                    checked={rememberMe}
                                    onCheckedChange={(checked) => setRememberMe(checked)}
                                />
                                <Label htmlFor="remember-me" className="text-sm font-normal">
                                    Remember me
                                </Label>
                            </div>
                            <Link to="/forgot-password" className="text-sm font-medium text-primary hover:text-primary/80">
                                Forgot password?
                            </Link>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Logging in..." : "Login"}
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
                            <p className="text-sm text-muted-foreground">
                                Don't have an account?{" "}
                                <Link to="/signup" className="font-medium text-primary hover:text-primary/80">
                                    Sign up
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            {/* Right side - Image */}
            <div className="hidden lg:block lg:w-1/2 bg-primary">
                <div className="h-full flex flex-col justify-center items-center text-primary-foreground p-12">
                    <div className="max-w-md">
                        <h2 className="text-3xl font-bold mb-6">Manage your IoT simulators with ease</h2>
                        <p className="text-lg mb-8">
                            HiveIoT provides a powerful interface to monitor and control your IoT device simulators in real-time.
                        </p>
                        <Card className="bg-white/10 backdrop-blur-sm border-0">
                            <CardContent className="p-6 text-white">
                                <p className="italic mb-4">
                                    "HiveIoT has revolutionized how we test our IoT infrastructure. The interface is intuitive and the
                                    real-time monitoring is invaluable."
                                </p>
                                <div className="flex items-center">
                                    <div className="w-10 h-10 bg-primary-foreground/30 rounded-full"></div>
                                    <div className="ml-3">
                                        <p className="font-medium">Sarah Johnson</p>
                                        <p className="text-sm opacity-75">IoT Engineer, TechCorp</p>
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

export default Login;