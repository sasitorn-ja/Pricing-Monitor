import { useEffect, useRef, useState } from "react";

type DivisionFcFilterProps = {
  divisions: string[];
  fcNamesByDivision: Record<string, string[]>;
  selectedDivisions: string[];
  selectedFcNames: string[];
  onToggleDivision: (value: string) => void;
  onClearDivisions: () => void;
  onToggleFcName: (value: string) => void;
  onClearFcNames: () => void;
};

export function DivisionFcFilter({
  divisions,
  fcNamesByDivision,
  selectedDivisions,
  selectedFcNames,
  onToggleDivision,
  onClearDivisions,
  onToggleFcName,
  onClearFcNames
}: DivisionFcFilterProps) {
  const [openDivision, setOpenDivision] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const activeFcNames = openDivision ? (fcNamesByDivision[openDivision] ?? []) : [];
  const isActiveDivisionSelected = openDivision ? selectedDivisions.includes(openDivision) : false;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!dropdownRef.current || dropdownRef.current.contains(event.target as Node)) {
        return;
      }

      setOpenDivision(null);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenDivision(null);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="divisionFcSplit">
      <div className="divisionDropdownRow">
        <button
          type="button"
          className={`compactFilterChip ${selectedDivisions.length === 0 && selectedFcNames.length === 0 ? "selected" : ""}`}
          onClick={() => {
            onClearDivisions();
            onClearFcNames();
            setOpenDivision(null);
          }}
        >
          ทั้งหมด
        </button>
        {selectedFcNames.length > 0 ? (
          <button type="button" className="clearFilterButton mini" onClick={onClearFcNames}>
            ล้าง FC
          </button>
        ) : null}
        {divisions.map((division) => {
          const fcNames = fcNamesByDivision[division] ?? [];
          const isDivisionSelected = selectedDivisions.includes(division);
          const selectedFcCount = fcNames.filter((fcName) =>
            selectedFcNames.includes(fcName)
          ).length;

          return (
            <button
              key={division}
              type="button"
              className={`divisionInlineButton ${
                isDivisionSelected || selectedFcCount > 0 || openDivision === division ? "selected" : ""
              }`}
              onClick={() => setOpenDivision((current) => (current === division ? null : division))}
            >
              <span>{division}</span>
              {selectedFcCount > 0 ? <em>{selectedFcCount}</em> : null}
              <i aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {openDivision ? (
        <div className="divisionInlineMenu">
          <label className={`divisionCheck ${isActiveDivisionSelected ? "selected" : ""}`}>
            <input
              type="checkbox"
              checked={isActiveDivisionSelected}
              onChange={() => onToggleDivision(openDivision)}
            />
            <span>ทั้งหมดใน {openDivision}</span>
          </label>
          <div className="fcCheckboxGrid">
            {activeFcNames.map((fcName) => (
              <label
                key={fcName}
                className={`fcCheck ${selectedFcNames.includes(fcName) ? "selected" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selectedFcNames.includes(fcName)}
                  onChange={() => onToggleFcName(fcName)}
                />
                <span>{fcName}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
