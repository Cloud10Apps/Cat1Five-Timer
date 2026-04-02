import React, { useState } from "react";
import { Building2, ArrowRight, ShieldCheck, CheckCircle2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function HorizontalCardLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      alert("Login successful (mock)");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#F8FAFC]">
      {/* Main Card */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Column: Brand */}
        <div className="w-full md:w-5/12 bg-amber-600 p-10 flex flex-col justify-between relative overflow-hidden text-amber-50 min-h-[400px]">
          {/* Abstract Geometric Background */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              <circle cx="120%" cy="-10%" r="60%" fill="currentColor" opacity="0.4" />
              <polygon points="0,100 100,100 50,0" fill="currentColor" opacity="0.2" transform="translate(-20, 300) scale(3)" />
            </svg>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 font-bold text-2xl text-white mb-2">
              <div className="bg-white/20 p-2 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              ElevatorTracker
            </div>
            <p className="text-amber-200 text-sm font-medium tracking-wide uppercase mt-12">
              Professional Grade
            </p>
            <h1 className="text-3xl font-bold text-white mt-2 leading-tight">
              Compliance <br /> made simple.
            </h1>
            <p className="text-amber-100 mt-4 leading-relaxed">
              Join hundreds of property managers streamlining their elevator inspections and compliance workflows.
            </p>
          </div>

          <div className="relative z-10 mt-12">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full border-2 border-amber-600 bg-amber-200 flex items-center justify-center text-amber-800 font-bold text-xs">
                  JD
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-amber-600 bg-amber-300 flex items-center justify-center text-amber-900 font-bold text-xs">
                  SM
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-amber-600 bg-amber-400 flex items-center justify-center text-amber-950 font-bold text-xs">
                  +8
                </div>
              </div>
              <div className="text-sm">
                <p className="font-semibold text-white">Top rated</p>
                <p className="text-amber-200 text-xs">by building owners</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="w-full md:w-7/12 p-10 md:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 mt-1">Please enter your details to sign in.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border-slate-200 rounded-lg focus-visible:ring-amber-500 focus-visible:border-amber-500"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                <a href="#" className="text-sm text-amber-600 hover:text-amber-700 font-medium">
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
                className="w-full px-4 py-2 border-slate-200 rounded-lg focus-visible:ring-amber-500 focus-visible:border-amber-500"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2.5 rounded-lg mt-6"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <a href="#" className="text-amber-600 hover:text-amber-700 font-medium">
              Request access
            </a>
          </div>
        </div>
      </div>

      {/* Trust Strip */}
      <div className="mt-8 w-full max-w-4xl flex flex-wrap justify-center gap-6 md:gap-12 text-sm text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <span>SOC 2 Compliant</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          <span>99.9% Uptime</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-amber-500" />
          <span>500+ Buildings Tracked</span>
        </div>
      </div>
    </div>
  );
}
