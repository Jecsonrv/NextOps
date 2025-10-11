import * as React from "react";
import { X, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { Badge } from "./Badge";
import PropTypes from "prop-types";

export function MultiSelect({
    options = [],
    selected = [],
    onChange,
    placeholder = "Seleccionar...",
    className,
    formatDisplay, // Nueva prop para formatear el display
}) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const dropdownRef = React.useRef(null);

    // Cerrar dropdown al hacer clic fuera
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setOpen(false);
            }
        };

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open]);

    const handleSelect = (value) => {
        const newSelected = selected.includes(value)
            ? selected.filter((item) => item !== value)
            : [...selected, value];
        onChange(newSelected);
    };

    const handleRemove = (value, e) => {
        e.stopPropagation();
        onChange(selected.filter((item) => item !== value));
    };

    // Helper para obtener el display text
    const getDisplayText = (value) => {
        return formatDisplay ? formatDisplay(value) : value;
    };

    const filteredOptions = options.filter((option) =>
        getDisplayText(option).toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[2.5rem]",
                    className
                )}
            >
                <div className="flex gap-1 flex-wrap flex-1">
                    {selected.length > 0 ? (
                        selected.map((value) => (
                            <Badge
                                key={value}
                                variant="secondary"
                                className="mr-1"
                            >
                                {getDisplayText(value)}
                                <button
                                    type="button"
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    onClick={(e) => handleRemove(value, e)}
                                >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </button>
                            </Badge>
                        ))
                    ) : (
                        <span className="text-muted-foreground">
                            {placeholder}
                        </span>
                    )}
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </button>

            {open && (
                <div className="absolute z-50 mt-2 w-full rounded-md border bg-popover shadow-md">
                    <div className="p-2">
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        />
                    </div>
                    <div className="max-h-64 overflow-auto p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                No se encontraron resultados.
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <div
                                    key={option}
                                    onClick={() => handleSelect(option)}
                                    className={cn(
                                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                        selected.includes(option) && "bg-accent"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                            selected.includes(option)
                                                ? "bg-primary text-primary-foreground"
                                                : "opacity-50"
                                        )}
                                    >
                                        {selected.includes(option) && (
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={2}
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                        )}
                                    </div>
                                    {getDisplayText(option)}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

MultiSelect.propTypes = {
    options: PropTypes.arrayOf(PropTypes.string),
    selected: PropTypes.arrayOf(PropTypes.string),
    onChange: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    className: PropTypes.string,
    formatDisplay: PropTypes.func,
};
