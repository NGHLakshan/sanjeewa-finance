// Lightweight Modal History & Back-Button Manager
// Handles phone / browser back buttons for all modals, popups and sub-views.

const modalStack = [];
let isProgrammaticBack = false;

/**
 * Register a modal to be closed when back button is pressed.
 * Returns an unregister function to call when the modal is closed via UI (e.g. X button).
 */
export function registerModal(closeFn) {
  // Push a state into browser history for this modal
  window.history.pushState({ modal: true, id: Date.now() }, "");
  
  const entry = { closeFn };
  modalStack.push(entry);

  return function unregister() {
    const idx = modalStack.indexOf(entry);
    if (idx !== -1) {
      modalStack.splice(idx, 1);
      // Remove the history entry we pushed without triggering popstate handler
      isProgrammaticBack = true;
      window.history.back();
      setTimeout(() => {
        isProgrammaticBack = false;
      }, 50);
    }
  };
}

/**
 * Check if any modal is currently open
 */
export function hasOpenModals() {
  return modalStack.length > 0;
}

/**
 * Handle popstate for modals.
 * Returns true if a modal was handled and closed, false otherwise.
 */
export function handleModalPopState() {
  if (isProgrammaticBack) {
    isProgrammaticBack = false;
    return true; // Was closed by UI button, history.back() just settled
  }

  if (modalStack.length > 0) {
    const topmost = modalStack.pop();
    if (topmost && typeof topmost.closeFn === "function") {
      topmost.closeFn();
      return true;
    }
  }

  return false;
}
