import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { LanguageProvider } from "./contexts/LanguageContext";
import { SessionProvider } from "./contexts/SessionContext";
import { AppShell } from "./components/layout/AppShell";
import HomePage from "./features/home/HomePage";
import AuthPage from "./features/auth/AuthPage";
import ProfilePage from "./features/auth/ProfilePage";

export default function App() {
  return (
    <LanguageProvider>
      <ErrorBoundary>
        <SessionProvider>
          <TooltipProvider>
            <Toaster />
            <Switch>
              <Route path="/auth"><AuthPage /></Route>
              <Route path="/profile"><ProfilePage /></Route>
              <Route><AppShell><HomePage /></AppShell></Route>
            </Switch>
          </TooltipProvider>
        </SessionProvider>
      </ErrorBoundary>
    </LanguageProvider>
  );
}
