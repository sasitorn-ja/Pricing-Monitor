import { useEffect, useRef } from "react";

type SingleSelectDropdownProps = {
  label: string;
  options: Array<{ value: string; label: string }>;
  selectedValue: string;
  fallbackLabel: string;
  onSelect: (value: string) => void;
};

export function SingleSelectDropdown({
  label,
  options,
  selectedValue,
  fallbackLabel,
  onSelect
}: SingleSelectDropdownProps) {
  const dropdownRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!dropdownRef.current?.open) {
        return;
      }

      if (!dropdownRef.current.contains(event.target as Node)) {
        dropdownRef.current.open = false;
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && dropdownRef.current?.open) {
        dropdownRef.current.open = false;
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const selectedLabel =
    options.find((option) => option.value === selectedValue)?.label ?? fallbackLabel;

  const closeDropdown = () => {
    if (dropdownRef.current) {
      dropdownRef.current.open = false;
    }
  };

  return (
    <details
      ref={dropdownRef}
      className="singleSelectDropdown"
      onToggle={(event) => {
        const currentDropdown = event.currentTarget;

        if (!currentDropdown.open) {
          return;
        }

        document
          .querySelectorAll<HTMLDetailsElement>(".topbarSharedFilter details[open]")
          .forEach((details) => {
            if (details !== currentDropdown) {
              details.open = false;
            }
          });
      }}
    >
      <summary>
        <span>{label}</span>
        <strong>{selectedLabel}</strong>
      </summary>
      <div className="singleSelectMenu">
        <button
          type="button"
          className={`singleSelectOption ${selectedValue === "" ? "selected" : ""}`}
          onClick={() => {
            onSelect("");
            closeDropdown();
          }}
        >
          {fallbackLabel}
        </button>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`singleSelectOption ${selectedValue === option.value ? "selected" : ""}`}
            onClick={() => {
              onSelect(option.value);
              closeDropdown();
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </details>
  );
}
