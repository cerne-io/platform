
import * as React from "react"

import { 
  Toast, 
  ToasterToast, 
  State, 
  actionTypes, 
  SUCCESS_TOAST_DURATION,
  INFO_TOAST_DURATION,
  WARNING_TOAST_DURATION,
  ERROR_TOAST_DURATION
} from "./types"
import { memoryState, listeners, dispatch } from "./toast-store"
import { genId } from "./toast-utils"

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  }
}

export function toast({ ...props }: Toast) {
  const id = genId()

  // Set default duration based on variant/severity
  let duration = props.duration;
  
  if (!duration) {
    if (props.variant === "success") {
      duration = SUCCESS_TOAST_DURATION;
    } else if (props.variant === "info") {
      duration = INFO_TOAST_DURATION;
    } else if (props.variant === "warning") {
      duration = WARNING_TOAST_DURATION;
    } else if (props.variant === "destructive") {
      duration = ERROR_TOAST_DURATION;
    }
  }

  const update = (props: ToasterToast) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id })

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      duration,
      open: true,
      onOpenChange: (open) => {
        props.onOpenChange?.(open);
        if (!open) dismiss();
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}
