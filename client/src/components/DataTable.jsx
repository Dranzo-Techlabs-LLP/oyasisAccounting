import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Input, Select } from "./FormPrimitives";

/**
 * Reusable data grid:
 * - Column-level sort (click header)
 * - Global search across declared `search` paths
 * - Per-column filter (select / text)
 * - Pagination
 * - Custom cell render via `column.render(row)`
 *
 * columns: [{
 *   key: "code",                  // unique
 *   label: "Code",
 *   accessor: (row) => row.code,  // value for sort + default cell
 *   render?: (row) => JSX,
 *   sortable?: true,
 *   filterType?: "select"|"text"|false,
 *   filterOptions?: [{value,label}],
 *   className?: "" (for td),
 *   headerClassName?: ""
 * }]
 */
export default function DataTable({
  rows = [],
  columns,
  initialSort = null,            // {key, dir}
  searchKeys = [],               // e.g. ["bookingCode", "customer.fullName"]
  pageSize: defaultPageSize = 10,
  emptyMessage = "No records found.",
  rowKey = (r) => r.id,
  onRowClick
}) {
  const [sort, setSort] = useState(initialSort);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({}); // {key: value}
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const getPath = (obj, dotted) => {
    if (typeof dotted === "function") return dotted(obj);
    return dotted.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
  };

  const filtered = useMemo(() => {
    let out = rows;
    if (query) {
      const q = query.toLowerCase();
      out = out.filter((r) =>
        searchKeys.some((k) => {
          const v = getPath(r, k);
          return v != null && String(v).toLowerCase().includes(q);
        })
      );
    }
    for (const [k, v] of Object.entries(filters)) {
      if (!v) continue;
      const col = columns.find((c) => c.key === k);
      out = out.filter((r) => {
        const cell = col?.accessor ? col.accessor(r) : getPath(r, k);
        if (cell == null) return false;
        return String(cell).toLowerCase().includes(String(v).toLowerCase());
      });
    }
    return out;
  }, [rows, query, filters, columns, searchKeys]);

  const sorted = useMemo(() => {
    if (!sort?.key) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const arr = [...filtered].sort((a, b) => {
      const av = col.accessor ? col.accessor(a) : getPath(a, sort.key);
      const bv = col.accessor ? col.accessor(b) : getPath(b, sort.key);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      // dates
      if (av instanceof Date || bv instanceof Date) {
        return (new Date(av) - new Date(bv));
      }
      // numbers
      const an = Number(av), bn = Number(bv);
      if (!Number.isNaN(an) && !Number.isNaN(bn) && av !== "" && bv !== "") {
        return an - bn;
      }
      return String(av).localeCompare(String(bv));
    });
    return sort.dir === "desc" ? arr.reverse() : arr;
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const toggleSort = (col) => {
    if (col.sortable === false) return;
    setSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: "asc" };
      if (prev.dir === "asc") return { key: col.key, dir: "desc" };
      return null;
    });
  };

  const SortIcon = ({ col }) => {
    if (col.sortable === false) return null;
    if (sort?.key !== col.key) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-50" />;
    return sort.dir === "asc"
      ? <ArrowUp className="ml-1 inline h-3 w-3" />
      : <ArrowDown className="ml-1 inline h-3 w-3" />;
  };

  const hasAnyFilter = !!query || Object.values(filters).some(Boolean);

  const filterColumns = columns.filter((c) => c.filterType);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {searchKeys.length > 0 && (
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--text-soft)]" />
            <Input className="pl-9 pr-9" placeholder="Search..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-3 rounded-full p-1 text-[var(--text-soft)] hover:bg-[var(--surface-muted)]" aria-label="Clear">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        {filterColumns.map((col) => (
          col.filterType === "select" ? (
            <Select
              key={col.key}
              className="w-48"
              value={filters[col.key] || ""}
              onChange={(e) => { setFilters((f) => ({ ...f, [col.key]: e.target.value })); setPage(0); }}
            >
              <option value="">{`All ${col.label.toLowerCase()}`}</option>
              {(col.filterOptions || []).map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          ) : (
            <Input
              key={col.key}
              className="w-48"
              placeholder={`Filter ${col.label.toLowerCase()}`}
              value={filters[col.key] || ""}
              onChange={(e) => { setFilters((f) => ({ ...f, [col.key]: e.target.value })); setPage(0); }}
            />
          )
        ))}
        {hasAnyFilter && (
          <button type="button" onClick={() => { setQuery(""); setFilters({}); setPage(0); }}
            className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-xs font-medium text-[var(--text-soft)] hover:text-[var(--text)]">
            Clear all
          </button>
        )}
        <div className="ml-auto text-xs text-[var(--text-soft)]">
          {sorted.length} {sorted.length === 1 ? "record" : "records"}
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto rounded-[12px] border border-[var(--line)] bg-white shadow-[0_1px_2px_rgba(13,50,50,0.04)] max-h-[70vh]">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--surface-muted)]/95 backdrop-blur text-[11px] uppercase tracking-wide text-[var(--text-soft)]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col)}
                  className={`whitespace-nowrap px-4 py-3 font-semibold transition-colors ${col.sortable === false ? "" : "cursor-pointer select-none hover:bg-white/60 hover:text-[var(--text)]"} ${col.headerClassName || ""}`}
                >
                  {col.label}<SortIcon col={col} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-1.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-muted)]">
                      <Search className="h-5 w-5 text-[var(--text-faint)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--text)]">{emptyMessage}</p>
                    {hasAnyFilter && <p className="text-xs text-[var(--text-soft)]">Try clearing filters above.</p>}
                  </div>
                </td>
              </tr>
            ) : pageRows.map((row, idx) => (
              <tr key={rowKey(row)}
                className={`border-t border-[var(--line)] transition-colors ${idx % 2 === 1 ? "bg-[var(--surface-muted)]/40" : "bg-white"} ${onRowClick ? "cursor-pointer hover:bg-[var(--brand-soft)]" : "hover:bg-[var(--surface-muted)]/70"}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 align-top ${col.className || ""}`}>
                    {col.render ? col.render(row) : (col.accessor ? col.accessor(row) : getPath(row, col.key))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-soft)]">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <Select className="w-20 h-8 text-xs" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}>
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0}
            className="rounded-md border border-[var(--line)] p-1.5 disabled:opacity-40 hover:bg-[var(--surface-muted)]"
            aria-label="Previous">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="px-2">Page {currentPage + 1} of {totalPages}</span>
          <button type="button" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}
            className="rounded-md border border-[var(--line)] p-1.5 disabled:opacity-40 hover:bg-[var(--surface-muted)]"
            aria-label="Next">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
