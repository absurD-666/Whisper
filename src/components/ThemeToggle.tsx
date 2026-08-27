import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/theme/ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <button type="button" onClick={toggleTheme} className={className} title={dark ? "Светлая тема" : "Тёмная тема"} aria-label={dark ? "Включить светлую тему" : "Включить тёмную тему"}>
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
