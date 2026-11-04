/** A load that runs once and is shared after, see lazyOnce. */
export type Lazy<T> = {
  /** Starts the load on the first call and returns the same promise after. A failed load is forgotten, so the next call tries again. */
  load: () => Promise<T>;
  /** The value once it has arrived, for a render that must be synchronous after the first load (a story's first frame). */
  peek: () => T | undefined;
};

/**
 * One rule for everything that stays out of the first bundle and is fetched on demand: a chunk of code (the
 * answer card, the account menu, the alerts body), the map geometry, the full dataset. The promise is shared by
 * every caller, a success is kept for good, and a failure (offline, a stale deploy) is dropped so that Retry
 * fetches again instead of replaying the same rejection.
 */
export function lazyOnce<T>(loader: () => Promise<T>): Lazy<T> {
  let pending: Promise<T> | undefined;
  let value: T | undefined;
  return {
    load: () =>
      (pending ??= loader().then(
        (loaded) => (value = loaded),
        (error: unknown) => {
          pending = undefined;
          throw error;
        },
      )),
    peek: () => value,
  };
}
