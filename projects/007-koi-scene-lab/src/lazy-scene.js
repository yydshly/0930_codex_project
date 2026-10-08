/** Share one initialization in flight; a failed attempt can be retried. */
export function createSceneLoader(create) {
  if (typeof create !== 'function') throw new TypeError('Scene initializer must be a function.');
  let instance, loaded = false, pending = null;
  return function load() {
    if (loaded) return Promise.resolve(instance);
    if (!pending) {
      pending = Promise.resolve().then(create).then(value => {
        instance = value;
        loaded = true;
        pending = null;
        return value;
      }, error => {
        pending = null;
        throw error;
      });
    }
    return pending;
  };
}
