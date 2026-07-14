// Holds the SW update function so the React update prompt can trigger a reload.
type Updater = (reloadPage?: boolean) => Promise<void>;
let updater: Updater | null = null;

export function setUpdater(fn: Updater): void {
  updater = fn;
}

export function applyUpdate(): void {
  void updater?.(true);
}
