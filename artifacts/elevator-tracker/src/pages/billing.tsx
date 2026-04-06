import { useState, useEffect } from "react";
import { CreditCard, Users, CheckCircle2, AlertCircle, ExternalLink, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "wouter";
import dayjs from "dayjs";

function getToken() {
  return localStorage.getItem("token") ?? "";
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

interface BillingStatus {
  status: string;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
    quantity: number;
    unitAmount: number | null;
  } | null;
  userCount: number;
}

interface Plan {
  product_id: string;
  product_name: string;
  product_description: string;
  price_id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string };
}

const STATUS_META: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active:   { label: "Active",    color: "bg-green-100 text-green-800 border-green-200",  icon: CheckCircle2 },
  trialing: { label: "Trial",     color: "bg-blue-100 text-blue-800 border-blue-200",    icon: Zap },
  past_due: { label: "Past Due",  color: "bg-red-100 text-red-800 border-red-200",       icon: AlertCircle },
  canceled: { label: "Canceled",  color: "bg-zinc-100 text-zinc-600 border-zinc-200",   icon: AlertCircle },
  inactive: { label: "No Plan",   color: "bg-zinc-100 text-zinc-600 border-zinc-200",   icon: AlertCircle },
};

export default function Billing() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      toast({ title: "Subscription activated!", description: "Welcome to Cat1Five Timer." });
    } else if (searchParams.get("canceled") === "1") {
      toast({ title: "Checkout canceled", description: "No charges were made.", variant: "destructive" });
    }
  }, []);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/billing/status"),
      apiFetch("/api/billing/plans"),
    ])
      .then(([s, p]) => {
        setStatus(s);
        setPlans(p.plans ?? []);
      })
      .catch(() => toast({ title: "Failed to load billing info", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (priceId: string) => {
    setCheckoutLoading(true);
    try {
      const { url } = await apiFetch("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ priceId }),
      });
      window.location.href = url;
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { url } = await apiFetch("/api/billing/portal", { method: "POST" });
      window.location.href = url;
    } catch (err: any) {
      toast({ title: "Could not open billing portal", description: err.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const meta = STATUS_META[status?.status ?? "inactive"] ?? STATUS_META.inactive;
  const StatusIcon = meta.icon;
  const isActive = status?.status === "active" || status?.status === "trialing";
  const monthlyCost = status?.subscription?.quantity != null &&
                      status?.subscription?.unitAmount != null
    ? (status.subscription.quantity * (status.subscription.unitAmount / 100))
        .toLocaleString("en-US", { style: "currency", currency: "USD" })
    : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <CreditCard className="h-8 w-8" />
          Billing
        </h1>
        <p className="text-muted-foreground">Manage your Cat1Five Timer subscription.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Subscription Status</CardTitle>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.color}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {meta.label}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Active Users</p>
                  <p className="text-2xl font-bold flex items-center gap-1.5">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    {status?.userCount ?? 0}
                  </p>
                </div>
                {isActive && status?.subscription && (
                  <>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground mb-1">Seats Billed</p>
                      <p className="text-2xl font-bold">{status.subscription.quantity}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground mb-1">Monthly Total</p>
                      <p className="text-2xl font-bold">{monthlyCost}</p>
                    </div>
                  </>
                )}
              </div>

              {isActive && status?.subscription && (
                <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm space-y-1">
                  <p className="text-muted-foreground">
                    Current period ends{" "}
                    <span className="font-semibold text-foreground">
                      {dayjs.unix(status.subscription.currentPeriodEnd).format("MMMM D, YYYY")}
                    </span>
                  </p>
                  {status.subscription.cancelAtPeriodEnd && (
                    <p className="text-red-600 font-medium">Subscription will cancel at end of period.</p>
                  )}
                </div>
              )}

              {isActive ? (
                <Button variant="outline" onClick={handlePortal} disabled={portalLoading} className="gap-2">
                  {portalLoading ? <Spinner /> : <ExternalLink className="h-4 w-4" />}
                  Manage Billing &amp; Invoices
                </Button>
              ) : null}
            </CardContent>
          </Card>

          {!isActive && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Choose a Plan</h2>
              {plans.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    No plans available yet. Check back soon.
                  </CardContent>
                </Card>
              ) : (
                plans.map((plan) => (
                  <Card key={plan.price_id} className="border-primary/40">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{plan.product_name}</CardTitle>
                          <CardDescription className="mt-1">{plan.product_description}</CardDescription>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-2xl font-bold">
                            ${((plan.unit_amount ?? 0) / 100).toFixed(0)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            per user / {plan.recurring?.interval}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2 space-y-3">
                      <ul className="space-y-1.5 text-sm text-muted-foreground">
                        {[
                          "Full CAT1 & CAT5 inspection tracking",
                          "Unlimited customers, buildings & elevators",
                          "Excel export & compliance calendar",
                          "Role-based access (Admin + Inspector)",
                          "Automatic follow-up scheduling",
                        ].map((f) => (
                          <li key={f} className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                        You currently have <strong>{status?.userCount ?? 0}</strong> active user{status?.userCount !== 1 ? "s" : ""}.
                        Your first charge will be{" "}
                        <strong>
                          {((Math.max(status?.userCount ?? 1, 1) * (plan.unit_amount ?? 0)) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}
                          /{plan.recurring?.interval}
                        </strong>.
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => handleSubscribe(plan.price_id)}
                        disabled={checkoutLoading}
                      >
                        {checkoutLoading ? <Spinner /> : "Subscribe Now"}
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
