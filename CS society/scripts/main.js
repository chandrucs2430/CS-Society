'use strict';
/* ---------- init ---------- */
document.addEventListener('click', event => {
  const button = event.target.closest('[data-mode]');
  if (!button) return;
  state.mode = button.dataset.mode;
  save();
  rerender();
  toast(state.mode === 'volunteer'
    ? 'Volunteer view: you can claim and update reports.'
    : 'Resident view: you can report and follow your reports.');
  const selected = $(`[data-mode="${state.mode}"]`);
  if (selected) selected.focus();
});
window.addEventListener('hashchange', route);
window.addEventListener('online', route);
window.addEventListener('offline', route);
window.addEventListener('error', event => {
  renderUnexpectedError(event.error || new Error(event.message || 'Unknown browser error'));
});
window.addEventListener('unhandledrejection', event => {
  renderUnexpectedError(event.reason instanceof Error ? event.reason : new Error('Unhandled promise rejection'));
});
initializeBackend().catch(handleBackendInitializationError);
