"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth-modal";
import { useAuth } from "@/components/auth-provider";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  if (loading) return <>{children}</>;

  if (!user) {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none blur-sm opacity-50">
          {children}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-lg bg-background/60 backdrop-blur-sm">
          <p className="text-sm font-medium text-muted-foreground">
            Sign in to try the demo
          </p>
          <Button
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
            onClick={() => setAuthOpen(true)}
          >
            Login / Sign Up
          </Button>
          <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
