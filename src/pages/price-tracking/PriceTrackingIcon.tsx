export type PriceTrackingIconName =
  | "dashboard"
  | "arrowUp"
  | "trend"
  | "chart"
  | "table"
  | "bell"
  | "chevron"
  | "moon"
  | "sun";

export function PriceTrackingIcon({ name }: { name: PriceTrackingIconName }) {
  if (name === "arrowUp") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 19V5" />
        <path d="m6 11 6-6 6 6" />
      </svg>
    );
  }

  if (name === "chevron") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
      </svg>
    );
  }

  if (name === "trend") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 18 9 12l4 4 7-9" />
        <path d="M15 7h5v5" />
      </svg>
    );
  }

  if (name === "chart") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 15v-4" />
        <path d="M12 15V8" />
        <path d="M16 15v-6" />
      </svg>
    );
  }

  if (name === "table") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5h14v14H5z" />
        <path d="M5 10h14" />
        <path d="M5 15h14" />
        <path d="M10 5v14" />
      </svg>
    );
  }

  if (name === "bell") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 9a6 6 0 0 1 12 0c0 7 2 7 2 8H4c0-1 2-1 2-8" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
    );
  }

  if (name === "moon") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3a7 7 0 1 0 11.5 11.5" />
      </svg>
    );
  }

  if (name === "sun") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h7v7H4z" />
      <path d="M13 5h7v7h-7z" />
      <path d="M4 14h7v5H4z" />
      <path d="M13 14h7v5h-7z" />
    </svg>
  );
}
