// Minimal service worker. No persistent background logic is needed today -
// the content script reads/writes chrome.storage.sync directly - but MV3
// extensions benefit from having one for lifecycle events and tooling hooks.
chrome.runtime.onInstalled.addListener(() => {
  // no-op
});
