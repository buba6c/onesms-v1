import * as React from "react"
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, XCircle, Info } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={2000} swipeDirection="down">
      {toasts.map(function ({ id, title, description, variant, ...props }) {
        const isDestructive = variant === 'destructive'
        const isSuccess = variant === 'success' || (!isDestructive && !variant)
        
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-center gap-3">
              {isDestructive ? (
                <XCircle className="h-5 w-5 flex-shrink-0" />
              ) : isSuccess ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              ) : (
                <Info className="h-5 w-5 flex-shrink-0" />
              )}
              <div className="flex flex-col">
                {title && <ToastTitle className="text-sm font-medium">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-xs opacity-90">{description}</ToastDescription>
                )}
              </div>
            </div>
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
