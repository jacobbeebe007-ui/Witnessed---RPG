export {};

declare global {
  interface Window {
    __WITNESSED_READY?: boolean;
    __WITNESSED_FAIL?: boolean;
    __WITNESSED_GAME?: unknown;
  }
}
