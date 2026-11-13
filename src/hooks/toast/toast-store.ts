
import { State, Action } from "./types"
import { reducer } from "./toast-reducer"
import { safeError } from "@/utils/productionLogger"

export const listeners: ((state: State) => void)[] = []

export let memoryState: State = { toasts: [] }

let dispatchDepth = 0
const MAX_DISPATCH_DEPTH = 50

export function dispatch(action: Action) {
  // Guard against infinite recursion
  if (dispatchDepth > MAX_DISPATCH_DEPTH) {
    safeError("Toast dispatch depth exceeded - preventing infinite recursion")
    return
  }
  
  dispatchDepth++
  memoryState = reducer(memoryState, action)
  
  // Make listener calls asynchronous to break synchronous recursion chain
  queueMicrotask(() => {
    listeners.forEach((listener) => {
      listener(memoryState)
    })
    dispatchDepth--
  })
}
