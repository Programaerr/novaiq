export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  text: string;
}

type Listener = (toast: ToastMessage) => void;

const listeners = new Set<Listener>();
let nextId = 1;

// A plain pub/sub instead of React context: showToast needs to be callable from anywhere
// (event handlers deep in ContractBuilder, AdminDashboard, etc.) without threading a
// dispatcher prop through every intermediate component. ToastHost is the sole subscriber,
// mounted once at the App root.
export function showToast(text: string, type: ToastType = 'info'): void {
  const toast: ToastMessage = { id: nextId++, type, text };
  listeners.forEach((listener) => listener(toast));
}

export function subscribeToToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
