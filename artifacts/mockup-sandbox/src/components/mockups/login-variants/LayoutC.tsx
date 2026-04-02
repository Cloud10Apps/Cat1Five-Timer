import { useState } from "react";
import { ArrowUpSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LayoutC() {
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
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans overflow-hidden">
      {/* LEFT PANEL — 65% width */}
      <div 
        className="hidden md:flex md:w-[65%] bg-zinc-950 flex-col justify-between p-16 lg:p-20 relative overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(circle, rgb(63 63 70 / 0.5) 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }}
      >
        {/* TOP: Logo */}
        <div className="flex items-center gap-2.5 font-bold text-xl text-zinc-50 tracking-tight">
          <div className="bg-amber-500 p-1.5 rounded-lg text-zinc-950">
            <ArrowUpSquare className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <span>InspectIQ Tracker</span>
        </div>

        {/* MIDDLE: Large typographic statement */}
        <div className="flex flex-col">
          <h1 className="text-7xl xl:text-8xl font-black tracking-tight leading-[0.95] text-zinc-50 uppercase flex flex-col">
            <span className="text-white">TRACK</span>
            <span className="text-white">COMPLI-</span>
            <span className="text-amber-500">ANCE.</span>
          </h1>
          <p className="text-lg text-zinc-400 font-light mt-8">
            Stay ahead of inspections.
          </p>
        </div>

        {/* BOTTOM: Rule & Copyright */}
        <div>
          <div className="w-16 h-0.5 bg-amber-500 mb-4"></div>
          <div className="text-sm text-zinc-600">
            © {new Date().getFullYear()} InspectIQ Tracker. All rights reserved.
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — 35% width */}
      <div className="w-full md:w-[35%] bg-white flex items-center justify-center p-10 relative">
        {/* Mobile Logo */}
        <div className="absolute top-8 left-8 md:hidden flex items-center gap-2 font-bold text-xl text-zinc-950">
          <div className="bg-amber-500 p-1.5 rounded-md text-zinc-950">
            <ArrowUpSquare className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span>InspectIQ Tracker</span>
        </div>

        <div className="w-full max-w-[280px] space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-zinc-950 tracking-tight">Welcome back</h2>
            <p className="text-sm text-zinc-500">Sign in to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                required
                className="h-10 text-sm border-zinc-200 focus-visible:ring-amber-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                className="h-10 text-sm border-zinc-200 focus-visible:ring-amber-500"
              />
            </div>

            {error && (
              <div className="text-xs text-red-600 font-medium">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 text-sm bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold shadow-none border-none mt-2"
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

            <div className="mt-6 text-center">
              <p className="text-xs text-zinc-400">© 2026 InspectIQ Tracker</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
