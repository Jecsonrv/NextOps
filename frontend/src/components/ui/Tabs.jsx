import PropTypes from 'prop-types';
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/utils";

/**
 * Tabs profesionales para ERP
 * Diseño minimalista con bordes sutiles
 */
const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
    <TabsPrimitive.List
        ref={ref}
        className={cn(
            "inline-flex items-center gap-1 border-b border-slate-200 pb-px",
            className
        )}
        {...props}
    />
));
TabsList.displayName = TabsPrimitive.List.displayName;

TabsList.propTypes = {
    className: PropTypes.string,
};

const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
        ref={ref}
        className={cn(
            "inline-flex items-center justify-center whitespace-nowrap px-3 py-2 text-sm font-medium text-slate-500 transition-colors",
            "border-b-2 border-transparent -mb-px",
            "hover:text-slate-700",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            "data-[state=active]:border-slate-800 data-[state=active]:text-slate-900",
            className
        )}
        {...props}
    />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

TabsTrigger.propTypes = {
    className: PropTypes.string,
};

const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
    <TabsPrimitive.Content
        ref={ref}
        className={cn(
            "mt-4 focus-visible:outline-none",
            className
        )}
        {...props}
    />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

TabsContent.propTypes = {
    className: PropTypes.string,
};

export { Tabs, TabsList, TabsTrigger, TabsContent };
