import React, { useState } from "react";
import { ArrowUpSquare, ShieldCheck, Activity, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CommandCenter() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Simulate login
    setTimeout(() => {
      setIsLoading(false);
      if (email === "admin@elevatortracker.com" && password === "admin") {
        alert("Login successful");
      } else {
        setError("ACCESS DENIED. INSUFFICIENT CLEARANCE.");
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-[#0a0f1a] text-slate-200 font-mono tracking-tight selection:bg-amber-500/30">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #ffffff 1px, transparent 1px),
            linear-gradient(to bottom, #ffffff 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      {/* Subtle radial gradient to focus center */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#0a0f1a]/80 to-[#0a0f1a] blur-xl pointer-events-none" />

      <div className="z-10 w-full max-w-md p-8 md:p-12 relative flex flex-col items-center border border-slate-800/50 bg-[#0f172a]/40 backdrop-blur-md rounded-sm">
        
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-amber-500/50 -mt-[1px] -ml-[1px]" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-amber-500/50 -mt-[1px] -mr-[1px]" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-amber-500/50 -mb-[1px] -ml-[1px]" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-amber-500/50 -mb-[1px] -mr-[1px]" />

        {/* Logo and Header */}
        <div className="flex flex-col items-center w-full mb-10">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded mb-6">
            <ArrowUpSquare className="h-10 w-10 text-amber-500" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold tracking-widest text-slate-100 uppercase text-center">ELEVATOR<span className="text-amber-500 font-light">TRACKER</span></h1>
          <div className="flex items-center justify-center gap-3 mt-4 text-[10px] uppercase tracking-widest text-slate-500">
            <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> SECURE</span>
            <span className="w-1 h-1 bg-slate-700 rounded-full" />
            <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> COMPLIANT</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs uppercase tracking-widest text-slate-400">Operator ID / Email</Label>
            <div className="relative">
              <Input 
                id="email" 
                type="email" 
                placeholder="operator@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-[#0b1120] border-slate-700 text-slate-200 placeholder:text-slate-600 focus-visible:ring-amber-500 focus-visible:border-amber-500 h-12 rounded-none font-mono text-sm shadow-inner"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password" className="text-xs uppercase tracking-widest text-slate-400">Access Key</Label>
              <a href="#" className="text-[10px] text-amber-500/70 hover:text-amber-500 uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:underline underline-offset-2">Reset Key</a>
            </div>
            <div className="relative">
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-[#0b1120] border-slate-700 text-slate-200 placeholder:text-slate-600 focus-visible:ring-amber-500 focus-visible:border-amber-500 h-12 rounded-none font-mono text-sm pl-10 shadow-inner"
              />
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {error && (
            <div className="text-xs font-mono font-medium text-red-400 bg-red-950/30 border border-red-900/50 p-3 rounded-none uppercase flex items-center justify-center tracking-widest">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-12 rounded-none bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold uppercase tracking-widest text-sm border-none transition-all mt-4"
          >
            {isLoading ? "Authenticating..." : "Initialize Session"}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-12 text-[10px] text-slate-600 uppercase tracking-widest font-mono text-center space-y-1">
          <p>Terminal Node: v4.2.1-stable</p>
          <p>Authorized Personnel Only</p>
        </div>
      </div>
    </div>
  );
}
