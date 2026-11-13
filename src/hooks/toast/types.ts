
import { Dispatch } from "react";

export type ToastProps = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export type Toast = Omit<
  ToastProps,
  "id" | "open" | "onOpenChange"
> & {
  id?: string;
  duration?: number;
  onOpenChange?: (open: boolean) => void;
} & {
  variant?: "default" | "destructive" | "success" | "warning" | "info";
};

export type ToasterToast = Required<Pick<ToastProps, "id">> &
  Omit<ToastProps, "id" | "onOpenChange"> & {
    onOpenChange?: (open: boolean) => void;
    variant?: "default" | "destructive" | "success" | "warning" | "info";
    duration?: number;
  };

export type State = {
  toasts: ToasterToast[];
};

export const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

export type Action =
  | {
      type: typeof actionTypes.ADD_TOAST;
      toast: ToasterToast;
    }
  | {
      type: typeof actionTypes.UPDATE_TOAST;
      toast: Partial<ToasterToast> & { id: string };
    }
  | {
      type: typeof actionTypes.DISMISS_TOAST;
      toastId?: string;
    }
  | {
      type: typeof actionTypes.REMOVE_TOAST;
      toastId?: string;
    };

export type ToastActionElement = React.ReactElement<{
  className?: string;
  toast: ToasterToast;
}>;

// Toast limits and delays
export const TOAST_LIMIT = 100;
export const TOAST_REMOVE_DELAY = 5000; // 5 seconds

// Toast durations in milliseconds
export const SUCCESS_TOAST_DURATION = 1000;
export const INFO_TOAST_DURATION = 3000;
export const WARNING_TOAST_DURATION = 5000;
export const ERROR_TOAST_DURATION = 7000;

export interface ToastContextType {
  toasts: ToasterToast[];
  toast: (props: Toast) => { id: string; dismiss: () => void; update: (props: ToasterToast) => void };
  dismiss: (toastId?: string) => void;
}

export type ToastDispatch = Dispatch<Action>;
