import PropTypes from "prop-types";

/**
 * Dialog component - Modal dialog implementation
 * Simple modal overlay for displaying content
 */
export function Dialog({ open, onOpenChange, children = null }) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => onOpenChange?.(false)}
        >
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/50" />

            {/* Dialog content */}
            <div className="relative z-50" onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
}

Dialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onOpenChange: PropTypes.func,
    children: PropTypes.node,
};

export function DialogContent({ className = "", children = null }) {
    return (
        <div
            className={`bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 ${className}`}
        >
            {children}
        </div>
    );
}

DialogContent.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
};

export function DialogHeader({ children = null, className = "" }) {
    return (
        <div className={`px-6 pt-6 pb-4 border-b ${className}`}>{children}</div>
    );
}

DialogHeader.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
};

export function DialogTitle({ children = null, className = "" }) {
    return (
        <h2 className={`text-xl font-semibold text-gray-900 ${className}`}>
            {children}
        </h2>
    );
}

DialogTitle.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
};

export function DialogDescription({ children = null, className = "" }) {
    return (
        <p className={`mt-2 text-sm text-gray-600 ${className}`}>{children}</p>
    );
}

DialogDescription.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
};

export function DialogFooter({ children = null, className = "" }) {
    return (
        <div className={`px-6 py-4 border-t flex justify-end space-x-2 ${className}`}>
            {children}
        </div>
    );
}

DialogFooter.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
};

DialogFooter.defaultProps = undefined;
