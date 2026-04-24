import { useEffect, useState } from "react";
import { PriceTrackingPage } from "../pages/price-tracking/PriceTrackingPage";

type ThemeMode = "dark" | "light";

export function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const storedTheme = window.localStorage.getItem("pricing-monitor-theme");
    return storedTheme === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.body.dataset.theme = themeMode;
    window.localStorage.setItem("pricing-monitor-theme", themeMode);
  }, [themeMode]);

  return (
    <PriceTrackingPage
      themeMode={themeMode}
      onToggleTheme={() => setThemeMode((mode) => (mode === "dark" ? "light" : "dark"))}
    />
  );
}
