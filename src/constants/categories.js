/**
 * The home screen's category strip.
 *
 * `name` doubles as the search keyword sent to `/api/products/search`, which is
 * how the web app worked — tapping a tile searches 1688 for that term.
 * `image` is the web's PNG tile, used by the home screen; `icon` names an
 * Ionicons glyph for compact lists such as the search screen's suggestions.
 */
export const HOME_CATEGORIES = [
  { name: 'Bags', icon: 'bag-handle', image: require('../assets/categories/bags.png') },
  { name: 'Shoes', icon: 'footsteps', image: require('../assets/categories/shoes.png') },
  { name: 'Jewelry', icon: 'diamond', image: require('../assets/categories/jewelry.png') },
  { name: 'Beauty Products', icon: 'color-palette', image: require('../assets/categories/beauty.png') },
  { name: 'Mens Clothing', icon: 'shirt', image: require('../assets/categories/mens.png') },
  { name: 'Womens Clothing', icon: 'woman', image: require('../assets/categories/womens.png') },
  { name: 'Baby Items', icon: 'happy', image: require('../assets/categories/baby.png') },
  { name: 'Sunglass', icon: 'glasses', image: require('../assets/categories/sunglass.png') },
  { name: 'Phone Accessories', icon: 'phone-portrait', image: require('../assets/categories/phone.png') },
  { name: 'Fitness', icon: 'barbell', image: require('../assets/categories/fitness.png') },
  { name: 'Watches', icon: 'watch', image: require('../assets/categories/watch.png') },
  { name: 'Food Items', icon: 'fast-food', image: require('../assets/categories/grocery.png') },
  { name: 'Traveling', icon: 'airplane', image: require('../assets/categories/travel.png') },
  { name: 'Gadgets', icon: 'hardware-chip', image: require('../assets/categories/gadgets.png') },
];

/**
 * The six fixed product rails below the category strip. `categoryId` is the
 * search keyword, matching the `<CollectionThree categoryId=...>` props on the
 * web home page.
 */
export const HOME_RAILS = [
  { title: 'Kids', categoryId: 'Kids dress' },
  { title: 'Jewelry', categoryId: 'Jewelry' },
  { title: 'Ladies Bags', categoryId: 'Ladies Bags' },
  { title: "Men's Shoes", categoryId: "Men's Shoes" },
  { title: 'Appliances', categoryId: 'Appliances' },
  { title: 'Fashion', categoryId: 'Fashion' },
];

export default { HOME_CATEGORIES, HOME_RAILS };
