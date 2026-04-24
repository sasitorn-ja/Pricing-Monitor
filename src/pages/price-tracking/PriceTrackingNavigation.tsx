import { type ReactNode, useEffect, useState } from "react";
import { PriceTrackingIcon } from "./PriceTrackingIcon";
import { priceTrackingMenuItems } from "./navigation";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from "@/components/ui/navigation-menu";

const COMPACT_FILTER_BREAKPOINT = 860;

type PriceTrackingNavigationProps = {
  themeMode: "dark" | "light";
  onToggleTheme: () => void;
  filterMenu?: ReactNode;
};

export function PriceTrackingNavigation({
  themeMode,
  onToggleTheme,
  filterMenu
}: PriceTrackingNavigationProps) {
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [isCompactFilterScreen, setIsCompactFilterScreen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  useEffect(() => {
    function syncScrollState() {
      setShowScrollToTop(window.scrollY > 180);
    }

    syncScrollState();
    window.addEventListener("scroll", syncScrollState, { passive: true });

    return () => window.removeEventListener("scroll", syncScrollState);
  }, []);

  useEffect(() => {
    function syncViewportState() {
      const compactScreen = window.innerWidth <= COMPACT_FILTER_BREAKPOINT;
      setIsCompactFilterScreen(compactScreen);
      setIsFilterMenuOpen((current) => (compactScreen ? current : false));
    }

    syncViewportState();
    window.addEventListener("resize", syncViewportState);

    return () => window.removeEventListener("resize", syncViewportState);
  }, []);

  const handleHomeButtonClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const shouldShowInlineFilter = Boolean(filterMenu) && !isCompactFilterScreen;
  const shouldShowCompactFilterToggle = Boolean(filterMenu) && isCompactFilterScreen;

  return (
    <>
      <div className="priceTrackingHeaderMain">
        <button
          type="button"
          className={`priceTrackingHomeButton${showScrollToTop ? " scrollToTop" : ""}`}
          onClick={handleHomeButtonClick}
          aria-label={showScrollToTop ? "กลับขึ้นด้านบน" : "หน้าแรก"}
          title={showScrollToTop ? "กลับขึ้นด้านบน" : "หน้าแรก"}
        >
          <PriceTrackingIcon name={showScrollToTop ? "arrowUp" : "dashboard"} />
        </button>

        <NavigationMenu viewport={false} className="navigationMenu">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>เมนู</NavigationMenuTrigger>
              <NavigationMenuContent className="navigationMenuContent">
                <div className="navigationMenuPanel">
                  {priceTrackingMenuItems.map((item) => (
                    <NavigationMenuLink key={item.label} asChild>
                      <a href={item.href} className="navigationMenuItem">
                        <strong>{item.label}</strong>
                        <span>{item.description}</span>
                      </a>
                    </NavigationMenuLink>
                  ))}
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {shouldShowInlineFilter ? <div className="topbarFilterSlot">{filterMenu}</div> : null}

      {shouldShowCompactFilterToggle ? (
        <div className="topbarCompactFilterSlot">
          <button
            type="button"
            className={`topbarCompactFilterToggle${isFilterMenuOpen ? " open" : ""}`}
            onClick={() => setIsFilterMenuOpen((current) => !current)}
            aria-expanded={isFilterMenuOpen}
            aria-label={isFilterMenuOpen ? "ซ่อนตัวกรอง" : "แสดงตัวกรอง"}
          >
            ตัวกรอง
            <PriceTrackingIcon name="chevron" />
          </button>
        </div>
      ) : null}

      <div className="topbarActions">
        <button
          type="button"
          className="topbarIconButton"
          onClick={onToggleTheme}
          aria-label={themeMode === "dark" ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
          title={themeMode === "dark" ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
        >
          <PriceTrackingIcon name={themeMode === "dark" ? "sun" : "moon"} />
        </button>
      </div>

      {shouldShowCompactFilterToggle && isFilterMenuOpen ? (
        <div className="topbarCompactFilterPanel">{filterMenu}</div>
      ) : null}
    </>
  );
}
