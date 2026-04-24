type DashboardFilterQueryOptions = {
  divisions: string[];
  segments: string[];
  channels: string[];
  fcNames: string[];
  discountTypes: string[];
  baselineStart?: string;
  baselineEnd?: string;
};

export function buildDashboardFilterQuery({
  divisions,
  segments,
  channels,
  fcNames,
  discountTypes,
  baselineStart,
  baselineEnd
}: DashboardFilterQueryOptions) {
  const params = new URLSearchParams();

  if (divisions.length > 0) {
    params.set("divisions", divisions.join(","));
  }

  if (segments.length > 0) {
    params.set("segments", segments.join(","));
  }

  if (channels.length > 0) {
    params.set("channels", channels.join(","));
  }

  if (fcNames.length > 0) {
    params.set("fcNames", fcNames.join(","));
  }

  if (discountTypes.length > 0) {
    params.set("discountTypes", discountTypes.join(","));
  }

  if (baselineStart) {
    params.set("baselineStart", baselineStart);
  }

  if (baselineEnd) {
    params.set("baselineEnd", baselineEnd);
  }

  return params;
}

export function summarizeMultiSelect(selectedValues: string[], fallbackLabel: string) {
  if (selectedValues.length === 0) {
    return fallbackLabel;
  }

  if (selectedValues.length === 1) {
    return selectedValues[0];
  }

  return `${selectedValues[0]} +${selectedValues.length - 1}`;
}
