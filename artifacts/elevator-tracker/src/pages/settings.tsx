import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { useListCustomers, getListCustomersQueryKey } from "@workspace/api-client-react";
import { Settings as SettingsIcon, Building2, Bell, Shield } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

export default function Settings() {
  const { user } = useAuth();

  const { data: customers, isLoading: customersLoading } = useListCustomers(
    {},
    { query: { queryKey: getListCustomersQueryKey({}) } }
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
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
              <Spinner size="sm" />
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
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configure how you receive alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border p-4 rounded-lg opacity-60">
            <div>
              <h4 className="font-medium">Overdue Inspection Alerts</h4>
              <p className="text-sm text-muted-foreground">Receive emails when inspections pass their due date.</p>
            </div>
            <Button variant="outline" disabled>Coming Soon</Button>
          </div>
          <div className="flex items-center justify-between border p-4 rounded-lg opacity-60">
            <div>
              <h4 className="font-medium">Weekly Digest</h4>
              <p className="text-sm text-muted-foreground">Summary of upcoming inspections for the week.</p>
            </div>
            <Button variant="outline" disabled>Coming Soon</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
