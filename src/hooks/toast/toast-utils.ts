
import { TOAST_REMOVE_DELAY } from "./types"
import { dispatch } from "./toast-store"
import { actionTypes } from "./types"

export const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

let count = 0

export function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

export function addToRemoveQueue(toastId: string) {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: actionTypes.REMOVE_TOAST,
      toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}
