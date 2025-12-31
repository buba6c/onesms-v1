import * as React from "react"
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, XCircle, Info } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={2000} swipeDirection="down">
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const isDestructive = variant === 'destructive'
        const isSuccess = variant === 'success' || (!isDestructive && !variant)

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {isDestructive ? (
                  <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                ) : isSuccess ? (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex flex-col flex-1 min-w-0">
                  {title && <ToastTitle className="text-sm font-medium">{title}</ToastTitle>}
                  {description && (
                    <ToastDescription className="text-xs opacity-90 mt-0.5">{description}</ToastDescription>
                  )}
                </div>
              </div>
              {action && <div className="w-full sm:w-auto">{action}</div>}
            </div>
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
