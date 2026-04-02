import React, { useState } from "react";
import { 
  ArrowUpSquare, 
  Loader2,
  LockKeyhole
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RefinedB() {
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
        alert("Login successful!");
      } else {
        setError("Invalid email or password. Please try again.");
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white overflow-hidden font-sans">
      {/* Left Panel - Brand / Value Prop */}
      <div 
        className="hidden md:flex md:w-1/2 bg-zinc-950 text-zinc-50 flex-col justify-between p-12 lg:p-24 relative overflow-hidden"
        style={{ backgroundImage: 'radial-gradient(circle, rgb(63 63 70 / 0.6) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      >
        {/* Subtle gradient overlay to enhance text readability over pattern */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-zinc-900/50 to-zinc-950 pointer-events-none" />
        
        {/* Watermark ET */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20rem] font-black text-zinc-800/20 pointer-events-none select-none">
          ET
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 font-bold text-2xl text-zinc-50 tracking-tight">
            <div className="bg-amber-500 p-1.5 rounded-lg text-zinc-950">
              <ArrowUpSquare className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <span>InspectIQ Tracker</span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg mt-12 mb-auto md:my-auto flex flex-col h-full">
          <div>
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-zinc-50 leading-[1.05]">
              Track compliance. <br />
              <span className="text-amber-500">Stay ahead of inspections.</span>
            </h1>
            <p className="text-lg text-zinc-400 mb-12 max-w-md leading-relaxed">
              The professional standard for managing elevator portfolios, compliance deadlines, and inspection schedules across all your buildings.
            </p>
          </div>
          
          <div className="mt-auto pt-12">
            <div className="border-l-2 border-amber-500 pl-4">
              <p className="italic text-zinc-300 text-base leading-relaxed mb-3">
                "InspectIQ Tracker cut our compliance review time in half. We used to chase spreadsheets — now everything is in one place."
              </p>
              <p className="text-zinc-500 text-sm font-medium">
                — Sarah K., Operations Director, Metro Lift Services
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-zinc-500 mt-8">
          © {new Date().getFullYear()} InspectIQ Tracker Inc. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 lg:p-24 bg-white relative">
        {/* Mobile Header (only visible on small screens) */}
        <div className="absolute top-8 left-8 md:hidden flex items-center gap-2 font-bold text-xl text-zinc-950">
          <div className="bg-amber-500 p-1.5 rounded-md text-zinc-950">
            <ArrowUpSquare className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span>InspectIQ Tracker</span>
        </div>

        <div className="w-full max-w-[400px] flex-1 flex flex-col justify-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-semibold text-zinc-500 mb-6">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              Trusted by 50+ inspection companies
            </div>
            
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

          <div className="mt-8 text-center text-sm text-zinc-500">
            Don't have an account?{" "}
            <a href="#" className="text-amber-600 hover:text-amber-700 font-medium transition-colors">
              Contact sales
            </a>
          </div>
        </div>
        
        <div className="mt-auto flex items-center justify-center gap-1.5 text-xs text-zinc-400 pt-8">
          <LockKeyhole className="w-3.5 h-3.5" />
          <span>Secured with 256-bit encryption</span>
        </div>
      </div>
    </div>
  );
}
