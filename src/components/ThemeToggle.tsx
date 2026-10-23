import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface Props {
  isLanding?: boolean;
}

export default function ThemeToggle({ isLanding }: Props) {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  // Initialize from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setDark(true);
    }
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setDark(!dark)}
      className={`relative overflow-hidden ${isLanding ? "text-primary-foreground hover:bg-primary-foreground/10" : "text-muted-foreground hover:text-foreground"}`}
      aria-label="Toggle theme"
    >
      <Sun className={`w-4 h-4 transition-all duration-300 ${dark ? "rotate-90 scale-0 absolute" : "rotate-0 scale-100"}`} />
      <Moon className={`w-4 h-4 transition-all duration-300 ${dark ? "rotate-0 scale-100" : "-rotate-90 scale-0 absolute"}`} />
    </Button>
  );
}
