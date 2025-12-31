import * as React from "react"
import { cn } from "@/lib/utils"

const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>

const Tooltip = ({ children }: { children: React.ReactNode }) => {
    return <div className="relative inline-flex group">{children}</div>
}

const TooltipTrigger = React.forwardRef<HTMLElement, { children: React.ReactNode; asChild?: boolean }>(
    ({ children, asChild, ...props }, ref) => {
        // If asChild is true, we should strictly clone the element, 
        // but for this simple shim, rendering children directly is usually visibly fine 
        // provided the styling is handled by the child. 
        // The 'group' class on the parent handles the hover state.
        return <>{children}</>
    }
)
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "absolute z-50 overflow-hidden rounded-md bg-slate-900 px-3 py-1.5 text-xs text-slate-50 shadow-md animate-in fade-in-0 zoom-in-95",
            "invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200",
            "bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap",
            className
        )}
        {...props}
    >
        {children}
    </div>
))
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
