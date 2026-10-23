import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import CreateChama from "./pages/CreateChama";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Wallet from "./pages/Wallet";
import Loans from "./pages/Loans";
import Events from "./pages/Events";
import Meetings from "./pages/Meetings";
import Reminders from "./pages/Reminders";
import Penalties from "./pages/Penalties";
import ChamaDetail from "./pages/ChamaDetail";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import Dividends from "./pages/Dividends";
import Welfare from "./pages/Welfare";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create" element={<CreateChama />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/events" element={<Events />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/penalties" element={<Penalties />} />
            <Route path="/dividends" element={<Dividends />} />
            <Route path="/welfare" element={<Welfare />} />
            <Route path="/chama/:id" element={<ChamaDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
