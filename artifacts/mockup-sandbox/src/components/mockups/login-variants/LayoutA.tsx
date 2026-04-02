import React, { useState } from "react";
import { ArrowUpSquare, LayoutDashboard, ClipboardCheck, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LayoutA() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Simulate API call
    setTimeout(() => {
      if (!email || !password) {
        setError("Please enter both email and password.");
        setIsLoading(false);
        return;
      }
      
      if (email === "error@example.com") {
        setError("Invalid email or password. Please try again.");
        setIsLoading(false);
        return;
      }
      
      setIsLoading(false);
      // Success state would go here in a real app
    }, 1500);
  };

  return (
    <div 
      className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-8 relative font-sans"
      style={{ 
        backgroundImage: 'radial-gradient(circle, rgb(63 63 70 / 0.5) 1px, transparent 1px)', 
        backgroundSize: '28px 28px' 
      }}
    >
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col">
        {/* HEADER BAND */}
        <div className="h-1 bg-amber-500 w-full" />

        {/* CONTENT AREA */}
        <div className="p-10 space-y-8">
          
          {/* Logo row */}
          <div className="flex items-center gap-2">
            <div className="bg-amber-500 p-1.5 rounded-lg text-zinc-950">
              <ArrowUpSquare className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-zinc-950 text-xl tracking-tight">ElevatorTracker</span>
          </div>

          {/* Headline */}
          <div>
            <h1 className="text-2xl font-bold text-zinc-950">
              Track compliance.
            </h1>
            <div className="text-amber-500 mt-1 font-medium">
              Stay ahead of inspections.
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-950 font-medium">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 border-zinc-200 focus-visible:ring-amber-500"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-950 font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 border-zinc-200 focus-visible:ring-amber-500"
                  disabled={isLoading}
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

          {/* Divider */}
          <hr className="border-zinc-100" />

          {/* Feature strip */}
          <div className="flex justify-between items-center px-2">
            <div className="flex flex-col items-center gap-1">
              <div className="text-amber-500">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <span className="text-xs text-zinc-500 font-medium">Dashboard</span>
            </div>
            
            <div className="flex flex-col items-center gap-1">
              <div className="text-amber-500">
                <ClipboardCheck className="h-4 w-4" />
              </div>
              <span className="text-xs text-zinc-500 font-medium">CAT1 & CAT5</span>
            </div>
            
            <div className="flex flex-col items-center gap-1">
              <div className="text-amber-500">
                <BellRing className="h-4 w-4" />
              </div>
              <span className="text-xs text-zinc-500 font-medium">Alerts</span>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-zinc-50 border-t border-zinc-100 py-3 px-10 text-xs text-zinc-400 text-center">
          © 2026 ElevatorTracker
        </div>
      </div>

      <div className="absolute bottom-8 text-xs text-zinc-600 text-center w-full">
        Sign in to manage your elevator compliance portfolio.
      </div>
    </div>
  );
}
