import * as React from "react";
import PropTypes from "prop-types";
import { X } from "lucide-react";

export function Sheet({ open, onOpenChange, children }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Overlay */}
            <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={() => onOpenChange(false)}
            />
            
            {/* Sheet Content */}
            <div className="relative w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
                {children}
            </div>
        </div>
    );
}

Sheet.propTypes = {
    open: PropTypes.bool.isRequired,
    onOpenChange: PropTypes.func.isRequired,
    children: PropTypes.node,
};

export function SheetHeader({ children, onClose }) {
    return (
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50/50">
            <div className="flex-1">{children}</div>
            <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-500"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
    );
}

SheetHeader.propTypes = {
    children: PropTypes.node,
    onClose: PropTypes.func.isRequired,
};

export function SheetContent({ children, className = "" }) {
    return (
        <div className={`flex-1 overflow-y-auto p-6 ${className}`}>
            {children}
        </div>
    );
}

SheetContent.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
};

export function SheetFooter({ children }) {
    return (
        <div className="px-6 py-4 border-t bg-gray-50/50 flex justify-end gap-3">
            {children}
        </div>
    );
}

SheetFooter.propTypes = {
    children: PropTypes.node,
};
