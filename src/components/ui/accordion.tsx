import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const AccordionContext = React.createContext<{
    value?: string
    onValueChange?: (value: string) => void
}>({})

const Accordion = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { type?: "single" | "multiple"; collapsible?: boolean; value?: string; onValueChange?: (value: string) => void }
>(({ className, children, value: controlledValue, onValueChange, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState<string>("")

    const value = controlledValue !== undefined ? controlledValue : internalValue

    const handleValueChange = (newValue: string) => {
        const finalValue = newValue === value ? "" : newValue
        setInternalValue(finalValue)
        onValueChange?.(finalValue)
    }

    return (
        <AccordionContext.Provider value={{ value, onValueChange: handleValueChange }}>
            <div ref={ref} className={className} {...props}>
                {children}
            </div>
        </AccordionContext.Provider>
    )
})
Accordion.displayName = "Accordion"

const AccordionItemContext = React.createContext<{ value: string }>({ value: "" })

const AccordionItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, ...props }, ref) => (
    <AccordionItemContext.Provider value={{ value }}>
        <div ref={ref} className={cn("border-b", className)} {...props} />
    </AccordionItemContext.Provider>
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = React.useContext(AccordionContext)
    const { value: itemValue } = React.useContext(AccordionItemContext)
    const isOpen = selectedValue === itemValue

    return (
        <div className="flex">
            <button
                ref={ref}
                type="button"
                onClick={() => onValueChange?.(itemValue)}
                className={cn(
                    "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline",
                    isOpen && "[&>svg]:rotate-180",
                    className
                )}
                {...props}
            >
                {children}
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
            </button>
        </div>
    )
})
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    const { value: selectedValue } = React.useContext(AccordionContext)
    const { value: itemValue } = React.useContext(AccordionItemContext)
    const isOpen = selectedValue === itemValue

    if (!isOpen) return null

    return (
        <div
            ref={ref}
            className={cn("overflow-hidden text-sm pb-4 pt-0", className)}
            {...props}
        >
            {children}
        </div>
    )
})
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
