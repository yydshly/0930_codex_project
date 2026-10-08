// The static public edition has no AI backend and must not probe a visitor's device.
export function supportsLocalCompanionService(location) {
  return ['http:', 'https:'].includes(location?.protocol) &&
    ['localhost', '127.0.0.1', '[::1]'].includes(location?.hostname);
}
