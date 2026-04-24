import { useEffect, useRef } from "react";

import { summarizeMultiSelect } from "../../utils/filters";

type MultiSelectDropdownProps = {
  label: string;
  options: string[];
  selectedValues: string[];
  fallbackLabel: string;
  getOptionLabel?: (value: string) => string;
  className?: string;
  menuClassName?: string;
  optionClassName?: string;
  onToggle: (value: string) => void;
  onClear: () => void;
};

export function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  fallbackLabel,
  getOptionLabel = (value) => value,
  className,
  menuClassName,
  optionClassName,
  onToggle,
  onClear
}: MultiSelectDropdownProps) {
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

  const closeDropdown = () => {
    if (dropdownRef.current) {
      dropdownRef.current.open = false;
    }
  };

  return (
    <details
      ref={dropdownRef}
      className={`multiSelectDropdown${className ? ` ${className}` : ""}`}
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
        <strong>{summarizeMultiSelect(selectedValues.map(getOptionLabel), fallbackLabel)}</strong>
      </summary>
      <div className={`multiSelectMenu${menuClassName ? ` ${menuClassName}` : ""}`}>
        <button
          type="button"
          className={`compactFilterChip${optionClassName ? ` ${optionClassName}` : ""} ${selectedValues.length === 0 ? "selected" : ""}`}
          onClick={() => {
            onClear();
            closeDropdown();
          }}
        >
          ทั้งหมด
        </button>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`compactFilterChip${optionClassName ? ` ${optionClassName}` : ""} ${selectedValues.includes(option) ? "selected" : ""}`}
            onClick={() => {
              onToggle(option);
              closeDropdown();
            }}
          >
            {getOptionLabel(option)}
          </button>
        ))}
      </div>
    </details>
  );
}
