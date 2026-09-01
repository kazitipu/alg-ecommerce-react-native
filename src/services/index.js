/**
 * Pure selectors over the product list. Ported unchanged from the web app —
 * none of them touch the DOM, so they carry over as-is.
 *
 * Several are Multikart template leftovers that operate on fields the ALG
 * catalogue does not use (`category`, `tags`, `sale`, `new`). They are kept for
 * import parity with ported screens; the ones the app actually relies on are
 * `getCartTotal`, `getBrands`, `getColors`, `getMinMaxPrice`,
 * `getVisibleproducts` and `getSingleItem`.
 */

export const getBrands = products => {
  const uniqueBrands = [];
  products.forEach(product => {
    if (product.tags) {
      product.tags.forEach(tag => {
        if (uniqueBrands.indexOf(tag) === -1) uniqueBrands.push(tag);
      });
    }
  });
  return uniqueBrands;
};

export const getColors = products => {
  const uniqueColors = [];
  products.forEach(product => {
    if (product.colors) {
      product.colors.split(',').forEach(color => {
        if (uniqueColors.indexOf(color) === -1) uniqueColors.push(color);
      });
    }
  });
  return uniqueColors;
};

export const getMinMaxPrice = products => {
  let min = 100;
  let max = 1000;
  products.forEach(product => {
    const price = product.price;
    min = price < min ? price : min;
    max = price > max ? price : max;
  });
  return { min, max };
};

export const getVisibleproducts = (data, { brand, color, value, sortBy }) =>
  data.products
    .filter(product => {
      const brandMatch = product.tags
        ? product.tags.some(tag => brand.includes(tag))
        : true;

      const colorMatch =
        color && product.colors ? product.colors.includes(color) : true;

      const startPriceMatch =
        typeof value.min !== 'number' || value.min <= product.price;
      const endPriceMatch =
        typeof value.max !== 'number' || product.price <= value.max;

      return brandMatch && colorMatch && startPriceMatch && endPriceMatch;
    })
    .sort((product1, product2) => {
      switch (sortBy) {
        case 'HighToLow':
          return product2.price < product1.price ? -1 : 1;
        case 'LowToHigh':
          return product2.price > product1.price ? -1 : 1;
        case 'Newest':
          return product2.id < product1.id ? -1 : 1;
        case 'AscOrder':
          return product1.name.localeCompare(product2.name);
        case 'DescOrder':
          return product2.name.localeCompare(product1.name);
        default:
          return product2.id > product1.id ? -1 : 1;
      }
    });

export const getCartTotal = cartItems => {
  let total = 0;
  for (let i = 0; i < cartItems.length; i++) {
    total += parseInt(cartItems[i].sum, 10);
  }
  return total;
};

export const getTopCollectionItems = (products, status) =>
  products.filter(product => product[status] === true).slice(0, 15);

export const getTrendingTagCollection = (products, type, tag) =>
  products
    .filter(product => product.category === type && product.tags.includes(tag))
    .slice(0, 15);

export const getTrendingCollection = (products, type) =>
  products.filter(product => product.category === type).slice(0, 8);

export const getSpecialCollection = (products, type) =>
  products.filter(product => product.category === type).slice(0, 5);

export const getTopCollection = products =>
  products.filter(product => product.rating > 4).slice(0, 8);

export const getNewProducts = (products, type) =>
  products
    .filter(product => product.new === true && product.category === type)
    .slice(0, 8);

export const getRelatedItems = (products, type) =>
  products.filter(product => product.category === type).slice(0, 4);

export const getBestSellerProducts = (products, type) =>
  products
    .filter(product => product.sale === true && product.category === type)
    .slice(0, 8);

export const getBestSeller = products =>
  products.filter(product => product.sale === true).slice(0, 8);

export const getMensWear = products =>
  products.filter(product => product.category === 'men').slice(0, 8);

export const getWomensWear = products =>
  products.filter(product => product.category === 'women').slice(0, 8);

export const getSingleItem = (products, id) =>
  products.find(element => element.id === id);

export const getFeatureImages = (products, type) =>
  products.filter(product => product.type === type);
