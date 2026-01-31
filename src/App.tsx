import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import Dashboard from "./pages/Dashboard";
import InboxPage from "./pages/InboxPage";
import ReviewPage from "./pages/ReviewPage";
import ReviewedReceiptsPage from "./pages/ReviewedReceiptsPage";
import CategoriesPage from "./pages/CategoriesPage";
import BudgetPage from "./pages/BudgetPage";
import SettingsPage from "./pages/SettingsPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
            <Route path="/inbox" element={<AuthGuard><InboxPage /></AuthGuard>} />
            <Route path="/review" element={<AuthGuard><ReviewPage /></AuthGuard>} />
            <Route path="/reviewed" element={<AuthGuard><ReviewedReceiptsPage /></AuthGuard>} />
            <Route path="/categories" element={<AuthGuard><CategoriesPage /></AuthGuard>} />
            <Route path="/budget" element={<AuthGuard><BudgetPage /></AuthGuard>} />
            <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <InstallPrompt />
          <OnboardingTour />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
