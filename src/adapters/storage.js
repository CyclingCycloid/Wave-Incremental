/**
 * A narrow storage port for the review build. Every key is prefixed before it
 * reaches the browser, so the production game cannot be overwritten by a
 * preview running on the same origin.
 *
 * Write errors deliberately propagate. The game's existing save handlers then
 * show a failure instead of claiming that a nonpersistent save succeeded.
 *
 * @param {Window & typeof globalThis} browser
 * @param {string} prefix
 */
function createScopedStorage(browser, prefix) {
  const keyOf = (key) => prefix + String(key);
  return Object.freeze({
    getItem(key) { return browser.localStorage.getItem(keyOf(key)); },
    setItem(key, value) { return browser.localStorage.setItem(keyOf(key), String(value)); },
    removeItem(key) { return browser.localStorage.removeItem(keyOf(key)); },
  });
}
