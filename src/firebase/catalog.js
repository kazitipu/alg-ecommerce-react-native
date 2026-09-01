import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from '@react-native-firebase/firestore';

import { db } from './app';
import { notifyError } from '../utils/notify';

/** Collects `.data()` off every document in a query snapshot. */
const docsToArray = snapshot => {
  const results = [];
  snapshot.forEach(document => results.push(document.data()));
  return results;
};

/** Newest first — these collections store `time` as a sortable numeric stamp. */
const byNewest = (a, b) => b.time - a.time;

const listCollection = async (path, { sorted = false } = {}) => {
  try {
    const results = docsToArray(await getDocs(collection(db, path)));
    return sorted ? results.sort(byNewest) : results;
  } catch (error) {
    notifyError(error);
    return [];
  }
};

/** Only rows the admin panel has flagged visible reach the storefront. */
const listVisible = async path => {
  try {
    return docsToArray(
      await getDocs(query(collection(db, path), where('visible', '==', true))),
    );
  } catch (error) {
    notifyError(error);
    return [];
  }
};

export const getAllFirestoreProducts = () => listCollection('products');
export const getAllFirestoreAliProductsList = () => listCollection('aliproducts');
export const getAllHomeCategory = () => listCollection('homeCategories');
export const getAllProductsTax = () => listCollection('taxes');
export const getAllPartials = () => listCollection('partial-payments');
export const getAllNotices = () => listCollection('notices', { sorted: true });
export const getAllBanners = () => listVisible('banners');
export const getAllCampaigns = () => listVisible('campaigns');

export const getSingleProduct = async id => {
  try {
    const snapshot = await getDoc(doc(db, `aliproducts/${id}`));
    return snapshot.data();
  } catch (error) {
    notifyError(error);
    return undefined;
  }
};

export const getSingleNotice = async noticeId => {
  const snapshot = await getDoc(doc(db, `notices/${noticeId}`));
  return snapshot.data();
};

/** CNY -> BDT conversion rate, applied to every 1688 price in the app. */
export const getCurrency = async () => {
  try {
    const snapshot = await getDoc(doc(db, 'Currency/taka'));
    return snapshot.data();
  } catch (error) {
    notifyError(error);
    return undefined;
  }
};

export const getSingleCoupon = async couponName => {
  const snapshot = await getDocs(
    query(collection(db, 'coupons'), where('name', '==', couponName)),
  );
  const coupons = docsToArray(snapshot);
  return coupons.length > 0 ? coupons[0] : null;
};

/**
 * Walks the 1688 category tree. Each document holds `level0`..`levelN` arrays,
 * and a category is found by testing whether the level array contains its id.
 */
export const get1688Category = async (level, categoryId) => {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, '1688Category'),
        where(`level${level}`, 'array-contains', categoryId),
      ),
    );
    return docsToArray(snapshot)[0];
  } catch (error) {
    notifyError(error);
    return undefined;
  }
};

/** Promotional splash shown on first launch; empty string means "none set". */
export const getSelectedIntroModal = async () => {
  const snapshot = await getDocs(
    query(collection(db, 'intros'), where('selected', '==', true)),
  );
  const intros = docsToArray(snapshot);
  return intros.length > 0 ? intros[0].imageUrl : '';
};

/**
 * Door-to-door freight rates. The collection name is built from the freight
 * type and origin country, e.g. `d2d-rates-air-china`.
 */
export const getAllD2DRates = (freightType, country) =>
  listCollection(`d2d-rates-${freightType}-${country}`);
