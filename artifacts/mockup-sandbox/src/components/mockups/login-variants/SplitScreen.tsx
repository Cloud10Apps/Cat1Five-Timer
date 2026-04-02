import React, { useState } from "react";
import { 
  ArrowUpSquare, 
  LayoutDashboard, 
  ClipboardCheck, 
  BellRing,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SplitScreenLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      if (email === "demo@example.com" && password === "password") {
        // Success would redirect here
        alert("Login successful!");
      } else {
        setError("Invalid email or password. Please try again.");
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white overflow-hidden font-sans">
      {/* Left Panel - Brand / Value Prop */}
      <div className="hidden md:flex md:w-1/2 bg-zinc-950 text-zinc-50 flex-col justify-between p-12 lg:p-24 relative overflow-hidden">
        {/* Subtle background glow/noise could go here, but keeping it clean with gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-zinc-900/50 to-zinc-950 pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 font-bold text-2xl text-zinc-50 tracking-tight">
            <div className="bg-amber-500 p-1.5 rounded-lg text-zinc-950">
              <ArrowUpSquare className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <span>ElevatorTracker</span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg mt-12 mb-auto md:my-auto">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-6 text-zinc-50 leading-[1.1]">
            Track compliance. <br />
            <span className="text-amber-500">Stay ahead of inspections.</span>
          </h1>
          <p className="text-lg text-zinc-400 mb-12 max-w-md leading-relaxed">
            The professional standard for managing elevator portfolios, compliance deadlines, and inspection schedules across all your buildings.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="mt-1 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800 text-amber-500">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100">Real-time compliance dashboard</h3>
                <p className="text-zinc-400 text-sm mt-1">See the status of every elevator in your portfolio at a glance.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="mt-1 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800 text-amber-500">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100">CAT1 & CAT5 tracking</h3>
                <p className="text-zinc-400 text-sm mt-1">Dedicated workflows for annual and 5-year testing requirements.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-1 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800 text-amber-500">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100">Automated overdue alerts</h3>
                <p className="text-zinc-400 text-sm mt-1">Never miss a deadline with proactive notifications and reports.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-zinc-500">
          © {new Date().getFullYear()} ElevatorTracker Inc. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white relative">
        {/* Mobile Header (only visible on small screens) */}
        <div className="absolute top-8 left-8 md:hidden flex items-center gap-2 font-bold text-xl text-zinc-950">
          <div className="bg-amber-500 p-1.5 rounded-md text-zinc-950">
            <ArrowUpSquare className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span>ElevatorTracker</span>
        </div>

        <div className="w-full max-w-[400px] space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-950 mb-2">Welcome back</h2>
            <p className="text-zinc-500 text-sm">
              Sign in to your account to manage your portfolio.
            </p>
          </div>

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
                  required
                  className="h-11 border-zinc-200 focus-visible:ring-amber-500"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-zinc-950 font-medium">Password</Label>
                  <a href="#" className="text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors">
                    Forgot password?
                  </a>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 border-zinc-200 focus-visible:ring-amber-500"
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

          <div className="text-center text-sm text-zinc-500">
            Don't have an account?{" "}
            <a href="#" className="text-amber-600 hover:text-amber-700 font-medium transition-colors">
              Contact sales
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
