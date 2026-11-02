/** Helpers shared by the notice list and detail screens. */

const asText = value =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

/** A notice's description without HTML tags, entities or extra whitespace. */
export const noticeText = notice =>
  asText(notice?.description)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();

export const noticeTitle = notice =>
  asText(notice?.title) || asText(notice?.name) || 'Notice';

/** Milliseconds for the notice's time (number, Date, Firestore Timestamp). */
export const noticeTime = notice => {
  const time = notice?.time;
  if (!time) return 0;
  if (typeof time === 'number') return time;
  if (typeof time?.toMillis === 'function') return time.toMillis();
  if (typeof time?.seconds === 'number') return time.seconds * 1000;
  const parsed = new Date(time).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Notices from the last 7 days count as new. */
export const isNewNotice = (notice, now = Date.now()) => {
  const time = noticeTime(notice);
  return time > 0 && now - time < 7 * 24 * 60 * 60 * 1000;
};

/** About how long it takes to read, at ~200 words a minute. */
export const readingMinutes = text =>
  Math.max(
    1,
    Math.round(
      String(text || '')
        .split(/\s+/)
        .filter(Boolean).length / 200,
    ),
  );
