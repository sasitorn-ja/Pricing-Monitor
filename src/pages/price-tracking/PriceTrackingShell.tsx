import { type ReactNode } from "react";
import { PriceTrackingNavigation } from "./PriceTrackingNavigation";

type PriceTrackingShellProps = {
  children: ReactNode;
  themeMode: "dark" | "light";
  onToggleTheme: () => void;
  filterMenu?: ReactNode;
};

export function PriceTrackingShell({
  children,
  themeMode,
  onToggleTheme,
  filterMenu
}: PriceTrackingShellProps) {
  return (
    <div className="priceTrackingFrame">
      <header className="priceTrackingHeader">
        <PriceTrackingNavigation
          themeMode={themeMode}
          onToggleTheme={onToggleTheme}
          filterMenu={filterMenu}
        />
      </header>

      <main className="priceTrackingViewport">{children}</main>
    </div>
  );
}
