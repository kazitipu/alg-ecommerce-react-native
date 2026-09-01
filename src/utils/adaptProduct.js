/**
 * Normalises a raw 1688/Taobao payload into the product shape the app renders.
 *
 * The legacy detail proxy (`globalbuybd.com/singleProduct/{id},{source}`)
 * returns the marketplace's own field names — `num_iid`, `pic_url`,
 * `seller_info`, `skus.sku`, `orginal_price` (sic) — while the newer
 * `alg.com.bd/api/products/{id}` endpoint returns something closer to what the
 * UI wants. This adapter is the bridge, shared by the `singleProduct` reducer
 * and the product detail screen so both agree on the shape.
 */
export const adaptProduct = (payload, route) => {
  if (payload === null || payload === undefined) return payload;

  // Some responses wrap the product one level deep (note the upstream typo).
  const product = payload.prodct_array ? payload.prodct_array : payload;

  const galleryImages = product.item_imgs ? product.item_imgs.map(image => image.url) : [];

  return {
    shop_name: product.seller_info?.shop_name,
    shop_id: product.seller_info?.sid,
    id: product.num_iid,
    detail_url: product.detail_url,
    name: product.title,
    pictures: [product.pic_url, ...galleryImages].filter(Boolean),
    salePrice: product.price,
    price: product.orginal_price,
    availability: route,
    categoryId: product.cid,
    rating: '5.0',
    description: product.desc,
    orders: product.total_sold,
    totalAvailableQuantity: '',
    specs: product.props,
    variants: product.skus ? product.skus.sku : [],
    feedback: [],
    brand: product.brand,
    brandId: product.brandId,
    props_name: product.props_name,
    props_list: product.props_list,
    // The upstream spells this key both ways depending on the marketplace.
    props_imgs: product.props_imgs ? product.props_imgs : product.prop_imgs,
    item_weight: product.item_weight,
    price_range: product.priceRange ? product.priceRange : [],
  };
};

export default adaptProduct;
