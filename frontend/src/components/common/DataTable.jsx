import { useState, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from "../ui/Table";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Search,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Download,
    Loader2,
} from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Enterprise DataTable — reusable table with sorting, filtering, pagination & export.
 *
 * @example
 * <DataTable
 *   columns={[
 *     { key: "nombre", header: "Nombre", sortable: true },
 *     { key: "monto", header: "Monto", sortable: true, align: "right",
 *       render: (val) => `$${val.toLocaleString()}` },
 *     { key: "estado", header: "Estado",
 *       render: (val) => <Badge>{val}</Badge> },
 *   ]}
 *   data={invoices}
 *   searchableKeys={["nombre", "numero_factura"]}
 *   searchPlaceholder="Buscar facturas..."
 *   onRowClick={(row) => navigate(`/invoices/${row.id}`)}
 *   pageSize={15}
 *   exportFilename="facturas"
 *   isLoading={isLoading}
 *   emptyMessage="No hay facturas registradas."
 * />
 */
export function DataTable({
    columns,
    data = [],
    searchableKeys = [],
    searchPlaceholder = "Buscar...",
    onRowClick,
    pageSize = 10,
    exportFilename,
    isLoading = false,
    emptyMessage = "No hay datos disponibles.",
    className,
    stickyHeader = true,
}) {
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState("asc");
    const [page, setPage] = useState(0);

    // ── Search filter ──
    const filtered = useMemo(() => {
        if (!search.trim() || searchableKeys.length === 0) return data;
        const q = search.toLowerCase();
        return data.filter((row) =>
            searchableKeys.some((key) => {
                const val = row[key];
                if (val == null) return false;
                return String(val).toLowerCase().includes(q);
            }),
        );
    }, [data, search, searchableKeys]);

    // ── Sort ──
    const sorted = useMemo(() => {
        if (!sortKey) return filtered;
        const col = columns.find((c) => c.key === sortKey);
        return [...filtered].sort((a, b) => {
            let va = a[sortKey];
            let vb = b[sortKey];
            // custom sort function
            if (col?.sortFn)
                return col.sortFn(va, vb) * (sortDir === "asc" ? 1 : -1);
            // nulls last
            if (va == null) return 1;
            if (vb == null) return -1;
            // numeric
            if (typeof va === "number" && typeof vb === "number") {
                return (va - vb) * (sortDir === "asc" ? 1 : -1);
            }
            // string
            return (
                String(va).localeCompare(String(vb), "es", {
                    sensitivity: "base",
                }) * (sortDir === "asc" ? 1 : -1)
            );
        });
    }, [filtered, sortKey, sortDir, columns]);

    // ── Pagination ──
    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const paginated = useMemo(
        () => sorted.slice(page * pageSize, (page + 1) * pageSize),
        [sorted, page, pageSize],
    );

    // Reset page on search
    const handleSearch = useCallback((e) => {
        setSearch(e.target.value);
        setPage(0);
    }, []);

    // Toggle sort
    const toggleSort = useCallback(
        (key) => {
            if (sortKey === key) {
                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
            } else {
                setSortKey(key);
                setSortDir("asc");
            }
            setPage(0);
        },
        [sortKey],
    );

    // ── CSV Export ──
    const handleExport = useCallback(() => {
        if (!exportFilename || sorted.length === 0) return;
        const exportCols = columns.filter((c) => c.exportKey !== false);
        const header = exportCols.map((c) => c.header || c.key).join(",");
        const rows = sorted.map((row) =>
            exportCols
                .map((c) => {
                    const val = row[c.exportKey || c.key];
                    if (val == null) return "";
                    const str = String(val).replace(/"/g, '""');
                    return str.includes(",") ||
                        str.includes('"') ||
                        str.includes("\n")
                        ? `"${str}"`
                        : str;
                })
                .join(","),
        );
        const csv = [header, ...rows].join("\n");
        const blob = new Blob(["\ufeff" + csv], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${exportFilename}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [sorted, columns, exportFilename]);

    // ── Sort icon ──
    const SortIcon = ({ colKey }) => {
        if (sortKey !== colKey)
            return (
                <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />
            );
        return sortDir === "asc" ? (
            <ArrowUp className="ml-1 h-3.5 w-3.5 text-accent" />
        ) : (
            <ArrowDown className="ml-1 h-3.5 w-3.5 text-accent" />
        );
    };

    return (
        <div className={cn("space-y-3", className)}>
            {/* Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Search */}
                {searchableKeys.length > 0 && (
                    <div className="relative max-w-sm flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={handleSearch}
                            className="pl-9"
                        />
                    </div>
                )}

                <div className="flex items-center gap-2">
                    {/* Result count */}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {filtered.length} registro
                        {filtered.length !== 1 ? "s" : ""}
                    </span>

                    {/* Export */}
                    {exportFilename && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            disabled={sorted.length === 0}
                            className="gap-1.5"
                        >
                            <Download className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Exportar</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader
                            className={
                                stickyHeader
                                    ? "sticky top-0 z-10 bg-muted/50 backdrop-blur-sm"
                                    : ""
                            }
                        >
                            <TableRow className="hover:bg-transparent">
                                {columns.map((col) => (
                                    <TableHead
                                        key={col.key}
                                        className={cn(
                                            "whitespace-nowrap select-none",
                                            col.align === "right" &&
                                                "text-right",
                                            col.align === "center" &&
                                                "text-center",
                                            col.headerClassName,
                                            col.sortable &&
                                                "cursor-pointer hover:text-foreground",
                                        )}
                                        onClick={
                                            col.sortable
                                                ? () => toggleSort(col.key)
                                                : undefined
                                        }
                                        style={
                                            col.width
                                                ? { width: col.width }
                                                : undefined
                                        }
                                    >
                                        <div
                                            className={cn(
                                                "flex items-center",
                                                col.align === "right" &&
                                                    "justify-end",
                                                col.align === "center" &&
                                                    "justify-center",
                                            )}
                                        >
                                            {col.header || col.key}
                                            {col.sortable && (
                                                <SortIcon colKey={col.key} />
                                            )}
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-40 text-center"
                                    >
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span>Cargando datos...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginated.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        {emptyMessage}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginated.map((row, idx) => (
                                    <TableRow
                                        key={row.id ?? idx}
                                        onClick={
                                            onRowClick
                                                ? () => onRowClick(row)
                                                : undefined
                                        }
                                        className={cn(
                                            onRowClick &&
                                                "cursor-pointer hover:bg-accent/5",
                                        )}
                                    >
                                        {columns.map((col) => (
                                            <TableCell
                                                key={col.key}
                                                className={cn(
                                                    col.align === "right" &&
                                                        "text-right",
                                                    col.align === "center" &&
                                                        "text-center",
                                                    col.cellClassName,
                                                )}
                                            >
                                                {col.render
                                                    ? col.render(
                                                          row[col.key],
                                                          row,
                                                      )
                                                    : (row[col.key] ?? "—")}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-xs text-muted-foreground">
                        Mostrando {page * pageSize + 1}–
                        {Math.min((page + 1) * pageSize, sorted.length)} de{" "}
                        {sorted.length}
                    </span>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPage(0)}
                            disabled={page === 0}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="px-3 text-xs font-medium text-muted-foreground">
                            {page + 1} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                                setPage((p) => Math.min(totalPages - 1, p + 1))
                            }
                            disabled={page >= totalPages - 1}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPage(totalPages - 1)}
                            disabled={page >= totalPages - 1}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

DataTable.propTypes = {
    /** Column definitions */
    columns: PropTypes.arrayOf(
        PropTypes.shape({
            key: PropTypes.string.isRequired,
            header: PropTypes.string,
            sortable: PropTypes.bool,
            sortFn: PropTypes.func,
            render: PropTypes.func,
            align: PropTypes.oneOf(["left", "center", "right"]),
            width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            headerClassName: PropTypes.string,
            cellClassName: PropTypes.string,
            exportKey: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
        }),
    ).isRequired,
    /** Row data array */
    data: PropTypes.array,
    /** Keys to search across */
    searchableKeys: PropTypes.arrayOf(PropTypes.string),
    searchPlaceholder: PropTypes.string,
    /** Row click handler — receives the row object */
    onRowClick: PropTypes.func,
    /** Rows per page (default 10) */
    pageSize: PropTypes.number,
    /** If set, shows export button; value is the filename prefix */
    exportFilename: PropTypes.string,
    isLoading: PropTypes.bool,
    emptyMessage: PropTypes.string,
    className: PropTypes.string,
    stickyHeader: PropTypes.bool,
};
