/** Creates a lock owned by one authentication context, with no global state. */
export const createSingleFlight = <T = void>(): ((operation: () => T | PromiseLike<T>) => Promise<T>) => {
  let inFlight: Promise<T> | undefined;
  return (operation) => {
    inFlight ??= Promise.resolve().then(operation).finally(() => {
      inFlight = undefined;
    });
    return inFlight;
  };
};
