import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth-provider";
import { ProtectedRoute } from "@/components/protected-route";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Customers from "@/pages/customers";
import Buildings from "@/pages/buildings";
import Elevators from "@/pages/elevators";
import Inspections from "@/pages/inspections";
import CalendarView from "@/pages/calendar";
import Admin from "@/pages/admin";
import Settings from "@/pages/settings";
import Billing from "@/pages/billing";

let queryClient: QueryClient;
queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          typeof query.queryKey[0] === "string" &&
          query.queryKey[0].startsWith("/api/dashboard"),
      });
      queryClient.invalidateQueries({ queryKey: ["monthly-forecast"] });
    },
  }),
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/dashboard">
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      </Route>
      <Route path="/customers">
        <ProtectedRoute><Customers /></ProtectedRoute>
      </Route>
      <Route path="/buildings">
        <ProtectedRoute><Buildings /></ProtectedRoute>
      </Route>
      <Route path="/elevators">
        <ProtectedRoute><Elevators /></ProtectedRoute>
      </Route>
      <Route path="/inspections">
        <ProtectedRoute><Inspections /></ProtectedRoute>
      </Route>
      <Route path="/calendar">
        <ProtectedRoute><CalendarView /></ProtectedRoute>
      </Route>
      <Route path="/reports">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/settings">
        <ProtectedRoute><Settings /></ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute requireAdmin><Admin /></ProtectedRoute>
      </Route>
      <Route path="/billing">
        <ProtectedRoute requireAdmin><Billing /></ProtectedRoute>
      </Route>
      
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      
      <Route>
        <ProtectedRoute><NotFound /></ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
