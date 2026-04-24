import { DivisionFcFilter } from "../filters/DivisionFcFilter";
import { MultiSelectDropdown } from "../filters/MultiSelectDropdown";
import { summarizeMultiSelect } from "../../utils/filters";

type SharedFilterMenuBarProps = {
  className?: string;
  selectedBaselineStart: string;
  selectedBaselineEnd: string;
  availableDivisions: string[];
  availableSegments: string[];
  availableChannels: string[];
  availableDiscountTypes: string[];
  fcNamesByDivision: Record<string, string[]>;
  selectedDivisions: string[];
  selectedSegments: string[];
  selectedChannels: string[];
  selectedFcNames: string[];
  selectedDiscountTypes: string[];
  onOpenBaselineHelp: () => void;
  onBaselineStartChange: (value: string) => void;
  onBaselineEndChange: (value: string) => void;
  onResetSharedFilters: () => void;
  onToggleDivision: (value: string) => void;
  onClearDivisions: () => void;
  onToggleFcName: (value: string) => void;
  onClearFcNames: () => void;
  onToggleSegment: (value: string) => void;
  onClearSegments: () => void;
  onToggleChannel: (value: string) => void;
  onClearChannels: () => void;
  onToggleDiscountType: (value: string) => void;
  onClearDiscountTypes: () => void;
};

export function SharedFilterMenuBar({
  className,
  selectedBaselineStart,
  selectedBaselineEnd,
  availableDivisions,
  availableSegments,
  availableChannels,
  availableDiscountTypes,
  fcNamesByDivision,
  selectedDivisions,
  selectedSegments,
  selectedChannels,
  selectedFcNames,
  selectedDiscountTypes,
  onOpenBaselineHelp,
  onBaselineStartChange,
  onBaselineEndChange,
  onResetSharedFilters,
  onToggleDivision,
  onClearDivisions,
  onToggleFcName,
  onClearFcNames,
  onToggleSegment,
  onClearSegments,
  onToggleChannel,
  onClearChannels,
  onToggleDiscountType,
  onClearDiscountTypes
}: SharedFilterMenuBarProps) {
  const divisionSummary =
    selectedFcNames.length > 0
      ? `FC ${selectedFcNames.length} รายการ`
      : summarizeMultiSelect(selectedDivisions, "ทุก division");

  return (
    <div className={`sharedFilterMenuBar${className ? ` ${className}` : ""}`} aria-label="ตัวกรองกราฟ">
      <div className="sharedFilterMenuTitle">
        <strong>ตัวกรองกราฟ</strong>
        <span>ใช้ร่วมกันทุกกราฟ</span>
      </div>

      <div className="topbarBaselineControls">
        <button
          type="button"
          className="baselineHelpButton topbarBaselineButton"
          onClick={onOpenBaselineHelp}
        >
          Baseline
        </button>
        <label>
          <span>เริ่ม</span>
          <input
            type="date"
            value={selectedBaselineStart}
            onChange={(event) => onBaselineStartChange(event.target.value)}
          />
        </label>
        <label>
          <span>ถึง</span>
          <input
            type="date"
            value={selectedBaselineEnd}
            onChange={(event) => onBaselineEndChange(event.target.value)}
          />
        </label>
      </div>

      <details
        className="sharedDivisionDropdown"
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
          <span>Division / FC</span>
          <strong>{divisionSummary}</strong>
        </summary>
        <div className="sharedDivisionMenu">
          <DivisionFcFilter
            divisions={availableDivisions}
            fcNamesByDivision={fcNamesByDivision}
            selectedDivisions={selectedDivisions}
            selectedFcNames={selectedFcNames}
            onToggleDivision={onToggleDivision}
            onClearDivisions={onClearDivisions}
            onToggleFcName={onToggleFcName}
            onClearFcNames={onClearFcNames}
          />
        </div>
      </details>

      <MultiSelectDropdown
        label="Segment"
        options={availableSegments}
        selectedValues={selectedSegments}
        fallbackLabel="ทุก segment"
        onToggle={onToggleSegment}
        onClear={onClearSegments}
      />
      <MultiSelectDropdown
        label="Channel"
        options={availableChannels}
        selectedValues={selectedChannels}
        fallbackLabel="ทุก channel"
        onToggle={onToggleChannel}
        onClear={onClearChannels}
      />
      <MultiSelectDropdown
        label="Discount"
        options={availableDiscountTypes}
        selectedValues={selectedDiscountTypes}
        fallbackLabel="ทุก discount"
        className="discountDropdown"
        menuClassName="discountDropdownMenu"
        optionClassName="discountDropdownOption"
        onToggle={onToggleDiscountType}
        onClear={onClearDiscountTypes}
      />

      <button type="button" className="clearFilterButton sharedFilterReset" onClick={onResetSharedFilters}>
        ล้างตัวกรอง
      </button>
    </div>
  );
}
