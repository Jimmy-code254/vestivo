import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield, Menu, Home, LayoutDashboard, Wallet, Banknote, CalendarDays, Video, Bell, PlusCircle, Settings, UserCircle, Trophy, BadgeDollarSign, Heart, Gavel, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";

const navLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/loans", label: "Loans", icon: Banknote },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/meetings", label: "Meetings", icon: Video },
  { to: "/reminders", label: "Reminders", icon: Bell },
  { to: "/penalties", label: "Penalties", icon: Gavel },
  { to: "/dividends", label: "Dividends", icon: BadgeDollarSign },
  { to: "/welfare", label: "Welfare", icon: Heart },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/create", label: "Create Chama", icon: PlusCircle },
];

const primaryNavLinks = navLinks.slice(0, 4);
const featureNavLinks = navLinks.slice(4);

export default function Navbar() {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const { user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const showBg = !isLanding || scrolled;
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);
  const hasActiveFeature = featureNavLinks.some((link) => isActive(link.to));

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${showBg ? "bg-background/95 backdrop-blur-lg border-b border-border shadow-sm" : "bg-transparent"}`}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className={`font-display font-bold text-lg ${!showBg ? "text-primary-foreground" : "text-foreground"}`}>
            Vestivo
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-5">
          {primaryNavLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors ${!showBg ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground"} ${isActive(link.to) ? (!showBg ? "text-primary-foreground" : "text-foreground") : ""}`}
            >
              {link.label}
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`${hasActiveFeature ? "text-foreground" : "text-muted-foreground"} ${!showBg ? "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10" : "hover:text-foreground"}`}
              >
                Features <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[80vh] min-w-52 overflow-y-auto">
              {featureNavLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <DropdownMenuItem key={link.to} asChild>
                    <Link to={link.to} className={isActive(link.to) ? "text-primary" : ""}>
                      <Icon className="mr-2 h-4 w-4" />
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link to="/admin">
                    <Settings className="mr-2 h-4 w-4" />
                    Admin
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle isLanding={!showBg} />
          {user && <NotificationBell isLanding={!showBg} />}
          {user ? (
            <>
              <Link to="/profile">
                <Button variant={!showBg ? "hero-outline" : "ghost"} size="sm"
                  className={`hidden sm:inline-flex gap-1.5 ${!showBg ? "border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <UserCircle className="w-4 h-4" />
                  Profile
                </Button>
              </Link>
              <Button variant={!showBg ? "hero-outline" : "outline"} size="sm" onClick={signOut}
                className={!showBg ? "border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" : ""}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant={!showBg ? "hero-outline" : "outline"} size="sm"
                  className={`hidden sm:inline-flex ${!showBg ? "border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" : ""}`}>
                  Sign In
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant={!showBg ? "gold" : "default"} size="sm">
                  Get Started
                </Button>
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className={`lg:hidden ${!showBg ? "text-primary-foreground" : "text-foreground"}`}>
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetTitle className="sr-only">Vestivo navigation</SheetTitle>
              <SheetDescription className="sr-only">Browse all Vestivo pages.</SheetDescription>
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-border">
                  <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="font-display font-bold text-lg text-foreground">Vestivo</span>
                  </Link>
                </div>
                <nav className="min-h-0 flex-1 overflow-y-auto py-4">
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    const active = isActive(link.to);
                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${active ? "bg-primary/10 text-primary border-r-2 border-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                      >
                        <Icon className="w-4 h-4" />
                        {link.label}
                      </Link>
                    );
                  })}
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${location.pathname === "/admin" ? "bg-primary/10 text-primary border-r-2 border-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                    >
                      <Settings className="w-4 h-4" />
                      Admin
                    </Link>
                  )}
                </nav>
                {user && (
                  <div className="p-6 border-t border-border space-y-3">
                    <Link to="/profile" onClick={() => setOpen(false)}>
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <UserCircle className="w-4 h-4" /> My Profile
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => { signOut(); setOpen(false); }}>
                      Sign Out
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
