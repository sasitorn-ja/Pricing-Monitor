import { DiscountTypeCheckboxGroup } from "../filters/DiscountTypeCheckboxGroup";
import { DivisionFcFilter } from "../filters/DivisionFcFilter";

type CompactDashboardFiltersProps = {
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

export function CompactDashboardFilters({
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
}: CompactDashboardFiltersProps) {
  return (
    <div className="compactFilterDock">
      <div className="compactFilterRow">
        <span className="compactFilterLabel">DIVISION</span>
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

      <div className="compactFilterRow">
        <span className="compactFilterLabel">SEGMENT</span>
        <div className="compactFilterChips">
          <button
            type="button"
            className={`compactFilterChip ${selectedSegments.length === 0 ? "selected" : ""}`}
            onClick={onClearSegments}
          >
            ทั้งหมด
          </button>
          {availableSegments.map((segment) => (
            <button
              key={segment}
              type="button"
              className={`compactFilterChip ${selectedSegments.includes(segment) ? "selected" : ""}`}
              onClick={() => onToggleSegment(segment)}
            >
              {segment}
            </button>
          ))}
        </div>
      </div>

      <div className="compactFilterRow">
        <span className="compactFilterLabel">CHANNEL</span>
        <div className="compactFilterChips">
          <button
            type="button"
            className={`compactFilterChip ${selectedChannels.length === 0 ? "selected" : ""}`}
            onClick={onClearChannels}
          >
            ทั้งหมด
          </button>
          {availableChannels.map((channel) => (
            <button
              key={channel}
              type="button"
              className={`compactFilterChip ${selectedChannels.includes(channel) ? "selected" : ""}`}
              onClick={() => onToggleChannel(channel)}
            >
              {channel}
            </button>
          ))}
        </div>
      </div>

      <div className="compactFilterRow">
        <span className="compactFilterLabel">DISCOUNT_TYPE</span>
        <DiscountTypeCheckboxGroup
          options={availableDiscountTypes}
          selectedValues={selectedDiscountTypes}
          onToggle={onToggleDiscountType}
          onClear={onClearDiscountTypes}
        />
      </div>
    </div>
  );
}
