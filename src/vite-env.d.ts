/// <reference types="vite/client" />

interface Window {
  requestIdleCallback?(
    callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
    options?: { timeout?: number }
  ): number;
  cancelIdleCallback?(handle: number): void;
}

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

