import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { LanguageProvider } from "./contexts/LanguageContext";
import { SessionProvider } from "./contexts/SessionContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppShell } from "./components/layout/AppShell";
import HomePage from "./features/home/HomePage";
import NotFoundPage from "./features/home/NotFoundPage";
import AuthPage from "./features/auth/AuthPage";
import ProfilePage from "./features/auth/ProfilePage";

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ErrorBoundary>
          <SessionProvider>
            <TooltipProvider>
              <Toaster />
              <Switch>
                <Route path="/auth"><AuthPage /></Route>
                <Route path="/profile"><ProfilePage /></Route>
                <Route path="/"><AppShell><HomePage /></AppShell></Route>
                <Route><NotFoundPage /></Route>
              </Switch>
            </TooltipProvider>
          </SessionProvider>
        </ErrorBoundary>
      </LanguageProvider>
    </ThemeProvider>
  );
}
