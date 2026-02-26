import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, User, Shield } from "lucide-react";

export default function LoginPage() {
  const { hasAdmin, login, register } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const isSetup = !hasAdmin;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isSetup) {
      register.mutate(
        { username, password },
        {
          onError: (err: Error) => {
            toast({ title: "Registration failed", description: err.message, variant: "destructive" });
          },
        }
      );
    } else {
      login.mutate(
        { username, password },
        {
          onError: (err: Error) => {
            toast({ title: "Login failed", description: err.message, variant: "destructive" });
          },
        }
      );
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" data-testid="login-page">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-md bg-primary flex items-center justify-center mb-2">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl" data-testid="text-login-title">
            {isSetup ? "Create Admin Account" : "Management Center"}
          </CardTitle>
          <CardDescription>
            {isSetup
              ? "Set up your admin credentials to get started"
              : "Sign in to access your dashboard"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  data-testid="input-username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  required
                  autoComplete="username"
                  minLength={isSetup ? 3 : 1}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  data-testid="input-password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  autoComplete={isSetup ? "new-password" : "current-password"}
                  minLength={6}
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              data-testid="button-login"
              disabled={login.isPending || register.isPending}
            >
              {login.isPending || register.isPending
                ? "Please wait..."
                : isSetup
                  ? "Create Account"
                  : "Sign In"}
            </Button>
          </form>
          {isSetup && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              This is a one-time setup. Only one admin account is allowed.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}