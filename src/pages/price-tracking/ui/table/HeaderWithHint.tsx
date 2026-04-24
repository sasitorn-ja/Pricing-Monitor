import type { TableColumnHelpKey } from "../../constants";

type HeaderWithHintProps = {
  hintKey: TableColumnHelpKey;
  label: string;
  hint: string;
  activeHint: TableColumnHelpKey | null;
  onToggle: (key: TableColumnHelpKey) => void;
};

export function HeaderWithHint({
  hintKey,
  label,
  hint,
  activeHint,
  onToggle
}: HeaderWithHintProps) {
  const isOpen = activeHint === hintKey;

  return (
    <span className={`thLabel ${isOpen ? "open" : ""}`}>
      {label}
      <button
        type="button"
        className={`hintDot ${isOpen ? "open" : ""}`}
        aria-label={hint}
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          onToggle(hintKey);
        }}
      >
        i
      </button>
      {isOpen ? <span className="hintPopup">{hint}</span> : null}
    </span>
  );
}
