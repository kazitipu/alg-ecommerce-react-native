/**
 * The app's own alert, a drop-in for React Native's `Alert.alert(title,
 * message, buttons)` that shows `AppAlertHost`'s styled sheet instead of the
 * system dialog. Buttons use the same shape: `{ text, style, onPress }`, where
 * `style` is 'cancel' or 'destructive'.
 */
let listener = null;
const queue = [];

/** Called once by AppAlertHost to receive alerts. */
export const setAlertListener = fn => {
  listener = fn;
  while (listener && queue.length) listener(queue.shift());
};

export const appAlert = (title, message, buttons) => {
  const request = {
    title: title ? String(title) : '',
    message: message ? String(message) : '',
    buttons: Array.isArray(buttons) && buttons.length ? buttons : [{ text: 'OK' }],
  };
  if (listener) listener(request);
  else queue.push(request);
};

/**
 * A suitable icon and tone for an alert: removals and destructive actions are
 * red, everything else is an informational notice.
 */
export const alertLook = buttons => {
  const destructive = (buttons || []).some(button => button?.style === 'destructive');
  return destructive ? { icon: 'trash-outline', tone: 'danger' } : { icon: 'information-circle', tone: 'info' };
};

export default appAlert;
