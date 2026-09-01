/**
 * The home screen's category strip.
 *
 * `name` doubles as the search keyword sent to `/api/products/search`, which is
 * how the web app worked — tapping a tile searches 1688 for that term.
 * `icon` names an Ionicons glyph, standing in for the web's PNG tiles so the
 * app ships no extra image assets for these.
 */
export const HOME_CATEGORIES = [
  { name: 'Bags', icon: 'bag-handle' },
  { name: 'Shoes', icon: 'footsteps' },
  { name: 'Jewelry', icon: 'diamond' },
  { name: 'Beauty Products', icon: 'color-palette' },
  { name: 'Mens Clothing', icon: 'shirt' },
  { name: 'Womens Clothing', icon: 'woman' },
  { name: 'Baby Items', icon: 'happy' },
  { name: 'Sunglass', icon: 'glasses' },
  { name: 'Phone Accessories', icon: 'phone-portrait' },
  { name: 'Fitness', icon: 'barbell' },
  { name: 'Watches', icon: 'watch' },
  { name: 'Food Items', icon: 'fast-food' },
  { name: 'Traveling', icon: 'airplane' },
  { name: 'Gadgets', icon: 'hardware-chip' },
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
