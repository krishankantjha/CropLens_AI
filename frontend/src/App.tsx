// Field Notes Intelligence reminder: seamless routing for Prompt 2 authenticated and guest product experiences.
import { Toaster } from "@/components/ui/sonner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Home from "@/pages/Home";
const Login = lazy(() => import("@/pages/auth/Login"));
const Signup = lazy(() => import("@/pages/auth/Signup"));
const Verify = lazy(() => import("@/pages/auth/Verify"));
const Onboarding = lazy(() => import("@/pages/onboarding/Onboarding"));
const KisanHub = lazy(() => import("@/pages/app/KisanHub"));
const MandiWorkspace = lazy(() => import("@/pages/app/MandiWorkspace"));
const AlertsPage = lazy(() => import("@/pages/app/AlertsPage"));
const MyCrop = lazy(() => import("@/pages/app/MyCrop"));
const HistoryPage = lazy(() => import("@/pages/app/HistoryPage"));
const ProfilePage = lazy(() => import("@/pages/app/ProfilePage"));
import NotFound from "@/pages/NotFound";
import PlaceholderPage from "@/pages/PlaceholderPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/verify" component={Verify} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/app"><ProtectedRoute><KisanHub /></ProtectedRoute></Route>
      <Route path="/mandi"><ProtectedRoute><MandiWorkspace /></ProtectedRoute></Route>
      <Route path="/alerts"><ProtectedRoute><AlertsPage /></ProtectedRoute></Route>
      <Route path="/my-crop"><ProtectedRoute><MyCrop /></ProtectedRoute></Route>
      <Route path="/history"><ProtectedRoute><HistoryPage /></ProtectedRoute></Route>
      <Route path="/profile"><ProtectedRoute><ProfilePage /></ProtectedRoute></Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PageFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#F8F7F2] px-4 text-center">
      <div>
        <p className="text-sm font-extrabold text-[#0E4D35]">Loading your CropLens view...</p>
        <p className="mt-1 text-xs text-[#66716A]">One moment while the next workspace opens.</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster position="bottom-right" />
            <Suspense fallback={<PageFallback />}>
              <Router />
            </Suspense>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
