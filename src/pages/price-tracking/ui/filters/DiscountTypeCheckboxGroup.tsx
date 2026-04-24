type DiscountTypeCheckboxGroupProps = {
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
};

export function DiscountTypeCheckboxGroup({
  options,
  selectedValues,
  onToggle,
  onClear
}: DiscountTypeCheckboxGroupProps) {
  if (options.length === 0) {
    return null;
  }

  return (
    <div className="discountTypeCheckboxes">
      <label className={`discountTypeOption ${selectedValues.length === 0 ? "selected" : ""}`}>
        <input
          type="checkbox"
          checked={selectedValues.length === 0}
          onChange={onClear}
        />
        <span>ทั้งหมด</span>
      </label>
      {options.map((option) => (
        <label
          key={option}
          className={`discountTypeOption ${selectedValues.includes(option) ? "selected" : ""}`}
        >
          <input
            type="checkbox"
            checked={selectedValues.includes(option)}
            onChange={() => onToggle(option)}
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}
