import { useTheme } from "@/lib/theme";

const LABELS = {
  light: "Light",
  dark: "Dark",
  system: "Auto",
} as const;

export default function ThemeToggle() {
  const { pref, resolved, cycleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="group flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-museum-muted transition hover:text-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
      aria-label={`Theme: ${pref}. Click to cycle.`}
      title={`Theme: ${pref}`}
    >
      <span className="relative flex h-4 w-4 items-center justify-center">
        {/* Sun */}
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`absolute h-4 w-4 transition-all duration-500 ${
            resolved === "light"
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-50 opacity-0"
          }`}
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
        {/* Moon */}
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`absolute h-4 w-4 transition-all duration-500 ${
            resolved === "dark"
              ? "rotate-0 scale-100 opacity-100"
              : "rotate-90 scale-50 opacity-0"
          }`}
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </span>
      <span>{LABELS[pref]}</span>
    </button>
  );
}
