import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'alg:recentSearches';
export const MAX_RECENT = 10;

/** Adds a keyword to the front, without duplicates (case-insensitive), keeping at most MAX_RECENT. */
export const addRecent = (list, keyword) => {
  const value = String(keyword || '').trim();
  const current = Array.isArray(list) ? list : [];
  if (!value) return current;
  const rest = current.filter(item => String(item).toLowerCase() !== value.toLowerCase());
  return [value, ...rest].slice(0, MAX_RECENT);
};

export const removeRecent = (list, keyword) =>
  (Array.isArray(list) ? list : []).filter(item => item !== keyword);

/** Whether text looks like a 1688 or Taobao/Tmall product link. */
export const isMarketplaceLink = text => /(1688\.com|taobao\.com|tmall\.com|tb\.cn)/i.test(String(text || ''));

export const loadRecent = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter(item => typeof item === 'string').slice(0, MAX_RECENT) : [];
  } catch (error) {
    return [];
  }
};

export const saveRecent = async list => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch (error) {
    // Recent searches are a convenience; losing them is harmless.
  }
};
