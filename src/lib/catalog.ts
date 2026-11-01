// Departments and categories. Listings store the category slug.

export type DeptKey = "women" | "men" | "kids" | "home" | "appliances";

export type IconKey =
  | "top" | "dress" | "jeans" | "shoe" | "heel" | "bag" | "agbada" | "swim" | "kids"
  | "sofa" | "chair" | "table" | "bed" | "lamp"
  | "fridge" | "micro" | "blender" | "fan" | "tv" | "gen";

export type Category = { slug: string; name: string; dept: DeptKey; icon: IconKey };

export const DEPARTMENTS: { key: DeptKey; label: string; isNew?: boolean; bulky?: boolean }[] = [
  { key: "women", label: "Women" },
  { key: "men", label: "Men" },
  { key: "kids", label: "Kids" },
  { key: "home", label: "Home & furniture", isNew: true, bulky: true },
  { key: "appliances", label: "Appliances", isNew: true, bulky: true },
];

export const CATEGORIES: Category[] = [
  { slug: "dresses", name: "Dresses", dept: "women", icon: "dress" },
  { slug: "womens-tops", name: "Tops", dept: "women", icon: "top" },
  { slug: "womens-bottoms", name: "Bottoms", dept: "women", icon: "jeans" },
  { slug: "womens-shoes", name: "Shoes", dept: "women", icon: "heel" },
  { slug: "bags", name: "Bags", dept: "women", icon: "bag" },
  { slug: "swimwear", name: "Swimwear", dept: "women", icon: "swim" },
  { slug: "mens-shirts", name: "Shirts", dept: "men", icon: "top" },
  { slug: "mens-trousers", name: "Trousers", dept: "men", icon: "jeans" },
  { slug: "native-wear", name: "Native wear", dept: "men", icon: "agbada" },
  { slug: "sneakers", name: "Sneakers", dept: "men", icon: "shoe" },
  { slug: "kids-clothes", name: "Kids' clothes", dept: "kids", icon: "kids" },
  { slug: "kids-shoes", name: "Kids' shoes", dept: "kids", icon: "shoe" },
  { slug: "sofas", name: "Sofas", dept: "home", icon: "sofa" },
  { slug: "chairs", name: "Chairs", dept: "home", icon: "chair" },
  { slug: "tables", name: "Tables", dept: "home", icon: "table" },
  { slug: "beds", name: "Beds", dept: "home", icon: "bed" },
  { slug: "lighting", name: "Lighting", dept: "home", icon: "lamp" },
  { slug: "fridges", name: "Fridges", dept: "appliances", icon: "fridge" },
  { slug: "microwaves", name: "Microwaves", dept: "appliances", icon: "micro" },
  { slug: "blenders", name: "Blenders", dept: "appliances", icon: "blender" },
  { slug: "fans", name: "Fans", dept: "appliances", icon: "fan" },
  { slug: "tvs", name: "TVs", dept: "appliances", icon: "tv" },
  { slug: "generators", name: "Generators", dept: "appliances", icon: "gen" },
];

export const HOME_CATEGORY_RAIL = [
  "dresses", "womens-tops", "womens-bottoms", "womens-shoes", "sofas", "chairs",
  "fridges", "microwaves", "blenders", "native-wear", "kids-clothes",
];

export function getCategory(slug: string | null | undefined): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function isBulky(categorySlug: string | null | undefined): boolean {
  const c = getCategory(categorySlug);
  return !!c && (c.dept === "home" || c.dept === "appliances");
}

export function deptLabel(key: string): string {
  return DEPARTMENTS.find((d) => d.key === key)?.label ?? "All";
}

export const CONDITIONS = {
  new_with_tags: "New with tags",
  pre_owned: "Pre-owned",
} as const;
export type Condition = keyof typeof CONDITIONS;

// Soft background + ink colours used for listings that have no photo yet.
const PALETTE: [string, string][] = [
  ["#FBE3D6", "#D9572B"], ["#E3E8EF", "#6C7A93"], ["#DCEFE6", "#2C6E5A"], ["#ECEEF3", "#8E97A8"],
  ["#F2E4D4", "#8A5A32"], ["#F2E2D2", "#8A4B2A"], ["#E1E8F4", "#3E5E97"], ["#F7DEDD", "#C9302C"],
  ["#E1ECF7", "#4C86C6"], ["#F6ECDD", "#C49A5B"], ["#EDE4DA", "#5B4636"], ["#FBE4EA", "#E58FA6"],
  ["#E3E6F5", "#22306B"], ["#F7EFD9", "#C59A3C"], ["#ECE2F4", "#7B4FA0"], ["#FAEBD3", "#E2A23B"],
];
export function artColours(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

const AVATAR_COLOURS = ["#C8364F", "#22306B", "#B07A12", "#1E7A52", "#7B4FA0", "#8A4B2A", "#1F6F8B", "#D9572B", "#2C3E8C", "#4A3426"];
export function avatarColour(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 17 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}
