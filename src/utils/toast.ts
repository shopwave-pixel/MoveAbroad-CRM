export const showToast = (message: string) => {
  const event = new CustomEvent('show-toast', { detail: { message } });
  window.dispatchEvent(event);
};
