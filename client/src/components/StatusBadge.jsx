import { statusDot, statusTone } from "../utils/formatters";

export default function StatusBadge({ value, size = "md" }) {
  const sizes = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5"
  };
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ring-1 ring-inset transition-colors ${sizes[size] || sizes.md} ${statusTone(value)}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot(value)}`} aria-hidden="true" />
      {String(value || "").replaceAll("_", " ")}
    </span>
  );
}
