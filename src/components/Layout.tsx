import { type FC, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../hooks/useTheme.ts";

// ---------------------------------------------------------------------------
// Layout – app shell with header, navigation, theme toggle
// ---------------------------------------------------------------------------

interface Props {
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: "/", label: "仪表盘", emoji: "🏠" },
  { to: "/review", label: "单条审核", emoji: "🔍" },
  { to: "/deep-review", label: "深度审核", emoji: "🧠" },
];

export const Layout: FC<Props> = ({ children }) => {
  const { resolved, toggle } = useTheme();
  const location = useLocation();
  const isActive = (to: string) =>
    location.pathname === to ||
    (to !== "/" && location.pathname.startsWith(to + "/"));

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2.5 font-bold tracking-tight"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-white shadow-sm shadow-primary/25">
                GQ
              </span>
              <span className="text-base text-zinc-800 dark:text-zinc-100">
                GeoQA Curator
              </span>
            </Link>

            {/* Nav */}
            <nav className="ml-2 hidden items-center gap-1 sm:flex">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                        : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  >
                    <span className="mr-1.5">{item.emoji}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label={resolved === "dark" ? "切换到日间模式" : "切换到夜间模式"}
              title={resolved === "dark" ? "切换到日间模式" : "切换到夜间模式"}
            >
              {/* Sun */}
              <svg
                className={`h-5 w-5 transition-all ${resolved === "dark" ? "rotate-90 scale-0 absolute" : "rotate-0 scale-100"} text-amber-500`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              {/* Moon */}
              <svg
                className={`h-5 w-5 transition-all ${resolved === "dark" ? "rotate-0 scale-100" : "rotate-90 scale-0 absolute"} text-primary-light`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="flex gap-1 px-4 py-2 sm:hidden border-t border-zinc-100 dark:border-zinc-800">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex-1 rounded-lg px-3 py-1.5 text-center text-xs font-medium transition-colors ${
                  active
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {item.emoji} {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 py-4 text-center text-xs text-zinc-400 dark:border-zinc-800/80">
        GeoQA Curator &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default Layout;
