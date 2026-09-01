/** Five-digit suffix used for order ids (`gbb#####`) and storage filenames. */
export const generateUniqueId = () =>
  ('0000' + (Math.random() * (100000 - 101) + 101)).slice(-5);

/** Six-digit id used for bookings, payment requests and refunds. */
export const generateBookingId = () =>
  `${Math.round(Math.random() * 1000000 - 1)}`;

/** Orders are grouped by "Month,Year" for the admin panel's reporting. */
export const getMonthName = () => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const now = new Date();
  return `${monthNames[now.getMonth()]},${now.getFullYear()}`;
};

export default { generateUniqueId, generateBookingId, getMonthName };
