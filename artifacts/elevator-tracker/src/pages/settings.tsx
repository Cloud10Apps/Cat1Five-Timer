import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { useListCustomers, getListCustomersQueryKey } from "@workspace/api-client-react";
import { Settings as SettingsIcon, Building2, Bell, Shield, Lock } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [passwordPending, setPasswordPending] = useState(false);

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onChangePassword = async (data: PasswordFormValues) => {
    setPasswordPending(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        toast({ title: "Failed to update password", description: json.error ?? "Unknown error", variant: "destructive" });
      } else {
        toast({ title: "Password updated successfully" });
        passwordForm.reset();
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setPasswordPending(false);
    }
  };

  const { data: customers, isLoading: customersLoading } = useListCustomers(
    {},
    { query: { queryKey: getListCustomersQueryKey({}) } }
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-8 w-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage your profile and organization preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            My Profile
          </CardTitle>
          <CardDescription>Your personal account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled />
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <Input value={user?.role || ""} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            My Companies
          </CardTitle>
          <CardDescription>Customers you currently have access to</CardDescription>
        </CardHeader>
        <CardContent>
          {customersLoading ? (
            <div className="flex items-center gap-2 py-2 text-muted-foreground">
              <Spinner className="h-4 w-4" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : customers && customers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {customers.map(c => (
                <Badge key={c.id} variant="outline" className="text-sm px-3 py-1.5 gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {c.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No customers assigned to your account.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4 max-w-sm">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={passwordPending}>
                {passwordPending ? "Updating…" : "Update Password"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configure how you receive alerts</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 shrink-0">
              <span className="text-xl">🔔</span>
            </div>
            <div>
              <p className="font-semibold text-amber-900">Email Notifications — Coming Soon</p>
              <p className="text-sm text-amber-800 mt-1">You'll receive email alerts 30, 60, and 90 days before inspections are due. This feature is currently in development.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
