import { statusTone } from "../utils/formatters";

export default function StatusBadge({ value }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusTone(
        value
      )}`}
    >
      {String(value || "").replaceAll("_", " ")}
    </span>
  );
}
