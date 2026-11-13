
import { useToast } from "@/hooks/toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex gap-3">
              {variant === "success" && <CheckCircle className="h-5 w-5 text-[#22C55E] dark:text-[#4ADE80]" />}
              {variant === "destructive" && <XCircle className="h-5 w-5 text-[#EF4444] dark:text-[#F87171]" />}
              {variant === "warning" && <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" />}
              {(variant === "info" || variant === "default" || !variant) && <Info className="h-5 w-5 text-[#3B82F6] dark:text-[#60A5FA]" />}

              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
