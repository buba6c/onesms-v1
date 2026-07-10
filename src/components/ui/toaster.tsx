import * as React from "react"
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, XCircle, Info, AlertTriangle, Loader2, Cpu } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={2000} swipeDirection="down">
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const isDestructive = variant === 'destructive'
        const isInfo = variant === 'info'
        const isWarning = variant === 'warning'
        const isLoading = variant === 'loading'
        const isSmart = variant === 'smart'
        const isSuccess = variant === 'success' || (!isDestructive && !isInfo && !isWarning && !isLoading && !isSmart && !variant)

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 flex-shrink-0 mt-0.5 animate-spin text-cyan-400" />
                ) : isSmart ? (
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    <Cpu className="h-4 w-4 text-cyan-400 animate-pulse" />
                  </div>
                ) : isDestructive ? (
                  <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-rose-400" />
                ) : isWarning ? (
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-400" />
                ) : isInfo ? (
                  <Info className="h-5 w-5 flex-shrink-0 mt-0.5 text-cyan-400" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5 text-emerald-400" />
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
