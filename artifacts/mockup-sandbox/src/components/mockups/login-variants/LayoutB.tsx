import React, { useState } from "react";
import { ArrowUpSquare, LayoutDashboard, ClipboardCheck, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LayoutB() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setError("Invalid email or password. Please try again.");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
      {/* HEADER STRIP */}
      <div className="w-full bg-zinc-950 py-10 px-16 flex flex-col justify-center">
        <div className="flex items-center justify-between">
          {/* LEFT side: Logo */}
          <div className="flex items-center gap-2.5 font-bold text-2xl text-zinc-50 tracking-tight">
            <div className="bg-amber-500 p-1.5 rounded-lg text-zinc-950">
              <ArrowUpSquare className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <span>InspectIQ Tracker</span>
          </div>

          {/* RIGHT side: Feature bullets */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <LayoutDashboard className="h-4 w-4 text-amber-500" />
              <span>Compliance dashboard</span>
            </div>
            <div className="w-px h-4 bg-zinc-700" />
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <ClipboardCheck className="h-4 w-4 text-amber-500" />
              <span>CAT1 & CAT5 tracking</span>
            </div>
            <div className="w-px h-4 bg-zinc-700" />
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <BellRing className="h-4 w-4 text-amber-500" />
              <span>Overdue alerts</span>
            </div>
          </div>
        </div>
        
        {/* Tagline on second line */}
        <p className="mt-4 text-zinc-400 text-sm">
          The professional standard for elevator compliance management.
        </p>
      </div>

      {/* BODY */}
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="max-w-sm w-full space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-950 mb-2">Welcome back</h2>
            <p className="text-zinc-500 text-sm">
              Sign in to your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-zinc-700">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="h-11 border-zinc-200 bg-white focus-visible:ring-amber-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-zinc-700">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="h-11 border-zinc-200 bg-white focus-visible:ring-amber-500"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold shadow-none border-none"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div>
            <hr className="border-zinc-200 mb-6" />
            <p className="text-xs text-zinc-400 text-center">
              © 2026 InspectIQ Tracker
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
