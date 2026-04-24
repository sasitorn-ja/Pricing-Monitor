import { formatPercentTick } from "../../utils/format";

export function renderPercentBarLabel(props: any) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  const height = Number(props.height ?? 0);
  const value = Number(props.value ?? 0);

  if (!value || value < 9 || height < 24 || width < 18) {
    return null;
  }

  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      fill="#f8fbff"
      fontSize={13}
      fontWeight={900}
      paintOrder="stroke"
      stroke="#071122"
      strokeWidth={3}
      strokeLinejoin="round"
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {formatPercentTick(value)}
    </text>
  );
}
