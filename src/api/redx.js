import axios from 'axios';

import { REDX } from '../constants/config';

/**
 * RedX is the Bangladesh-side courier: it tracks the final leg and quotes the
 * in-country delivery charge.
 *
 * The access token ships in the client exactly as it does on the web. It should
 * really sit behind our own backend — keeping it in `constants/config.js` means
 * that move touches one file.
 */
const redxClient = axios.create({
  baseURL: REDX.baseUrl,
  timeout: 20000,
  headers: { 'API-ACCESS-TOKEN': `Bearer ${REDX.accessToken}` },
});

export const trackParcel = async courierTrackingId => {
  const { data } = await redxClient.get(`/parcel/track/${courierTrackingId}`);
  return data;
};

/** Delivery areas within a district; the address form needs an area's id. */
export const fetchAreas = async districtName => {
  const { data } = await redxClient.get('/areas', {
    params: { district_name: districtName },
  });
  return data?.areas || [];
};

export const calculateDeliveryCharge = async ({ deliveryAreaId, weight, cashCollectionAmount }) => {
  const { data } = await redxClient.get('/charge/charge_calculator', {
    params: {
      delivery_area_id: deliveryAreaId,
      weight,
      cash_collection_amount: cashCollectionAmount,
    },
  });
  return data;
};
