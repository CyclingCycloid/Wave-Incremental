/** WI1 save encoding. No game-state or DOM dependency; relies on the host's
 * btoa/atob and the legacy escape/unescape globals (standard idiom, universally supported). */
function createSaveCodec(browser) {
  function encodeSave(obj) {
    const json = JSON.stringify(obj);
    const b64 = browser.btoa(browser.unescape(browser.encodeURIComponent(json)));
    return 'WI1-' + b64;
  }

  function decodeSave(str) {
    str = str.trim();
    if (str.startsWith('WI1-')) str = str.slice(4);
    const json = browser.decodeURIComponent(browser.escape(browser.atob(str)));
    return JSON.parse(json);
  }

  return Object.freeze({ encodeSave, decodeSave });
}
