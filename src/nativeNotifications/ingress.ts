import type {FluxFramework} from '@nlabs/arkhamjs';

const handlers = new WeakMap<FluxFramework, (payload: unknown) => Promise<boolean>>();
export const bindNativeNotificationIngress = (
  flux: FluxFramework, handler: (payload: unknown) => Promise<boolean>
): (() => void) => {
  handlers.set(flux, handler);
  return () => {
    if(handlers.get(flux) === handler) {
      handlers.delete(flux);
    }
  };
};
export const routeNativeNotificationIngress = (flux: FluxFramework, payload: unknown): boolean => {
  const handler = handlers.get(flux);
  if(!handler) {
    return false;
  }
  void handler(payload).catch(() => undefined);
  return true;
};
