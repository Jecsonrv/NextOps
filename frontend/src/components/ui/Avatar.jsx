import * as React from "react";
import PropTypes from "prop-types";
import { cn } from "../../lib/utils";

const Avatar = React.forwardRef(({ className = "", children }, ref) => {
    return (
        <div
            ref={ref}
            className={cn(
                "relative flex h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100 text-gray-600",
                className
            )}
        >
            {children}
        </div>
    );
});
Avatar.displayName = "Avatar";

Avatar.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
};

const AvatarImage = React.forwardRef(({ className = "", src, alt = "" }, ref) => {
    return (
        <img
            ref={ref}
            src={src}
            alt={alt}
            className={cn("h-full w-full object-cover", className)}
        />
    );
});
AvatarImage.displayName = "AvatarImage";

AvatarImage.propTypes = {
    className: PropTypes.string,
    src: PropTypes.string,
    alt: PropTypes.string,
};

const AvatarFallback = React.forwardRef(({ className = "", children }, ref) => {
    return (
        <span
            ref={ref}
            className={cn(
                "flex h-full w-full items-center justify-center text-sm font-medium uppercase",
                className
            )}
        >
            {children}
        </span>
    );
});
AvatarFallback.displayName = "AvatarFallback";

AvatarFallback.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
};

export { Avatar, AvatarImage, AvatarFallback };
