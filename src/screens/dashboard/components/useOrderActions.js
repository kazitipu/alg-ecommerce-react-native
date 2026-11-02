import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';

import { uploadRefundApplyRedux } from '../../../actions';
import { getOrderTotals } from '../../../utils/dashboard';
import { notifyError, notifySuccess } from '../../../utils/notify';
import { ROUTES } from '../../../navigation/routes';
import { PAYMENT_TARGETS } from '../../payment';
import { buildRefundRequest } from './RefundSheet';

/** Payment-sheet params for an existing order or product request; the sheet applies the web's amount rules. */
export const paymentParamsFor = (record, isRequest, returnRoute = ROUTES.DASHBOARD) => {
  const { total, paid, due } = getOrderTotals(record);
  return {
    amount: due,
    target: isRequest ? PAYMENT_TARGETS.PRODUCT_REQUEST : PAYMENT_TARGETS.ORDER,
    orders: [record],
    productRequestArray: isRequest ? [record] : [],
    existing: { kind: isRequest ? 'request' : 'order', total, paid, due },
    returnRoute,
  };
};

/**
 * "Pay now" and "Quick refund" for the orders list and the order details
 * page, so both behave the same. `onDone` reloads after a refund is filed.
 */
const useOrderActions = ({ onDone } = {}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [refundFor, setRefundFor] = useState(null);
  const [refunding, setRefunding] = useState(false);

  const payFor = useCallback(
    (record, isRequest, returnRoute) =>
      navigation.navigate(ROUTES.PAYMENT_SHEET, paymentParamsFor(record, isRequest, returnRoute)),
    [navigation],
  );

  const submitRefund = async form => {
    if (refunding || !refundFor) return;
    setRefunding(true);
    try {
      const updated = await dispatch(uploadRefundApplyRedux(buildRefundRequest({ order: refundFor, ...form })));
      if (!updated) return;
      setRefundFor(null);
      notifySuccess('Refund requested', 'Our team will review it shortly.');
      onDone?.();
    } catch (error) {
      notifyError(error, 'Could not request the refund.');
    } finally {
      setRefunding(false);
    }
  };

  return {
    payFor,
    refundFor,
    refunding,
    openRefund: setRefundFor,
    closeRefund: () => setRefundFor(null),
    submitRefund,
  };
};

export default useOrderActions;
