"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";

interface InvitationValidation {
  email: string;
  tenant_name: string;
  tenant_id: string;
  role: string;
  expires_at: string;
  is_valid: boolean;
}

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  // Validation state
  const [invitation, setInvitation] = useState<InvitationValidation | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        const data = await api.validateInvitation(token);
        setInvitation(data);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { detail?: string } } };
        setValidationError(
          error.response?.data?.detail || "Invalid or expired invitation"
        );
      } finally {
        setIsValidating(false);
      }
    };

    if (token) {
      validateToken();
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.acceptInvitation(token, {
        name: fullName,
        password,
      });
      // Auto-login after accepting invitation
      api.setToken(response.access_token);
      api.setRefreshToken(response.refresh_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">Validating invitation...</p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (validationError) {
    return (
      <Card>
        <CardHeader className="text-center">
          <Link href="/" className="mx-auto mb-4 flex items-center gap-2">
            <Image
              src="/android-chrome-192x192.png"
              alt="VoxCalls"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-xl font-bold">VoxCalls</span>
          </Link>
          <CardTitle>Invalid Invitation</CardTitle>
          <CardDescription>{validationError}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            <p>This invitation link is no longer valid.</p>
            <p className="mt-2">It may have expired or already been used.</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Link href="/login" className="w-full">
            <Button className="w-full">Go to Login</Button>
          </Link>
          <p className="text-sm text-muted-foreground">
            Need a new invitation? Contact your administrator.
          </p>
        </CardFooter>
      </Card>
    );
  }

  // Success - show signup form
  return (
    <Card>
      <CardHeader className="text-center">
        <Link href="/" className="mx-auto mb-4 flex items-center gap-2">
          <Image
            src="/android-chrome-192x192.png"
            alt="VoxCalls"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="text-xl font-bold">VoxCalls</span>
        </Link>
        <CardTitle>Complete Your Registration</CardTitle>
        <CardDescription>
          You&apos;ve been invited to join <strong>{invitation?.tenant_name}</strong>
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Invitation Info */}
          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{invitation?.email}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Organization:</span>
              <span className="font-medium">{invitation?.tenant_name}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Role:</span>
              <span className="font-medium capitalize">{invitation?.role}</span>
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium">
                Full Name
              </label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create Account"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}
