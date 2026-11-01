// Adds demo stores and sample listings so the site isn't empty while testing.
// Safe to run more than once. Remove everything with: npm run db:seed -- --remove
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const STORES = [
  ["toluscloset", "Tolu's Closet", "Lagos", "Ankara, owambe dresses and everyday pieces. I reply fast."],
  ["kicksbydayo", "Kicks by Dayo", "Lagos", "Clean, authentic sneakers. Lekki pickup or delivery."],
  ["okrikagold", "Okrika Gold", "Port Harcourt", "Hand-picked okrika gems, washed and ironed."],
  ["adeolastitches", "Adeola Stitches", "Ibadan", "Tailor-made native wear for men."],
  ["thriftwithamaka", "Thrift with Amaka", "Abuja", "Party dresses and shoes, worn once or twice."],
  ["lekkihomefinds", "Lekki Home Finds", "Lagos", "Furniture and appliances from people relocating."],
  ["japasaleslagos", "Japa Sales Lagos", "Lagos", "Everything must go. Fridges, TVs, sofas, beds."],
  ["mamatwinsstore", "Mama Twins Store", "Lagos", "Kids' clothes and shoes in great condition."],
];

// [title, brand, dept, category, price ₦, was ₦, condition, city, area, seller, tested, size or dimensions]
const ITEMS = [
  ["Ankara wrap midi dress", "Handmade", "women", "dresses", 14500, 0, "pre_owned", "Lagos", "Yaba", "toluscloset", false, "UK 12"],
  ["3-seater fabric sofa, grey", "Home Plus", "home", "sofas", 185000, 320000, "pre_owned", "Lagos", "Lekki", "japasaleslagos", false, "210 × 90 cm"],
  ["LG double-door fridge, 335L", "LG", "appliances", "fridges", 240000, 410000, "pre_owned", "Lagos", "Ikeja", "japasaleslagos", true, "170 × 60 × 65 cm"],
  ["Nike Air Force 1 '07", "Nike", "men", "sneakers", 38000, 0, "pre_owned", "Lagos", "Lekki", "kicksbydayo", false, "EU 43"],
  ["Embroidered agbada set", "Tailor made", "men", "native-wear", 45000, 60000, "new_with_tags", "Ibadan", "Bodija", "adeolastitches", false, "L"],
  ["Silver sequin birthday dress", "Zara", "women", "dresses", 68000, 0, "pre_owned", "Abuja", "Wuse 2", "thriftwithamaka", false, "M"],
  ['Binatone standing fan, 18"', "Binatone", "appliances", "fans", 22000, 35000, "pre_owned", "Lagos", "Surulere", "lekkihomefinds", true, "130 cm tall"],
  ["Solid wood dining table, 6 seats", "Custom", "home", "tables", 150000, 0, "pre_owned", "Abuja", "Garki", "lekkihomefinds", false, "180 × 90 cm"],
  ["Leather crossbody bag", "Coach", "women", "bags", 27500, 55000, "pre_owned", "Port Harcourt", "GRA", "okrikagold", false, ""],
  ['Samsung 43" smart TV', "Samsung", "appliances", "tvs", 160000, 260000, "pre_owned", "Lagos", "Ajah", "japasaleslagos", true, "97 × 56 cm"],
  ["Rattan accent chair", "Handmade", "home", "chairs", 42000, 0, "new_with_tags", "Lagos", "Yaba", "lekkihomefinds", false, "70 × 75 × 80 cm"],
  ["Vintage Levi's 501 jeans", "Levi's", "men", "mens-trousers", 12000, 0, "pre_owned", "Port Harcourt", "GRA", "okrikagold", false, "W32 L32"],
  ["Kids' Adidas tracksuit", "Adidas", "kids", "kids-clothes", 8500, 12000, "pre_owned", "Lagos", "Ikeja", "mamatwinsstore", false, "Age 6–7"],
  ["Polka dot bubble top", "Shein", "women", "womens-tops", 12000, 0, "new_with_tags", "Lagos", "Gbagada", "toluscloset", false, "S"],
  ["Scanfrost microwave, 20L", "Scanfrost", "appliances", "microwaves", 38000, 65000, "pre_owned", "Lagos", "Lekki", "lekkihomefinds", true, "45 × 35 × 26 cm"],
  ["Block heel sandals", "Aldo", "women", "womens-shoes", 11000, 25000, "pre_owned", "Abuja", "Garki", "thriftwithamaka", false, "EU 39"],
  ["Queen bed frame with headboard", "Custom", "home", "beds", 95000, 140000, "pre_owned", "Lagos", "Magodo", "japasaleslagos", false, "160 × 200 cm"],
  ["Yaya bubble set", "Fashion Nova", "women", "swimwear", 25000, 30000, "new_with_tags", "Lagos", "Ajah", "toluscloset", false, "M"],
  ["Firman 3.5kVA generator", "Firman", "appliances", "generators", 310000, 450000, "pre_owned", "Lagos", "Ikeja", "lekkihomefinds", true, "68 × 52 × 54 cm"],
  ["Adire tie-dye shirt", "Abeokuta Adire", "men", "mens-shirts", 9000, 0, "new_with_tags", "Ibadan", "Ring Road", "adeolastitches", false, "XL"],
  ["Brass floor lamp", "IKEA", "home", "lighting", 28000, 48000, "pre_owned", "Lagos", "Lekki", "lekkihomefinds", false, "150 cm tall"],
  ["Kenwood blender, 1.5L", "Kenwood", "appliances", "blenders", 18000, 30000, "pre_owned", "Abuja", "Maitama", "thriftwithamaka", true, "40 cm tall"],
  ["Satin slip dress", "H&M", "women", "dresses", 7500, 0, "pre_owned", "Lagos", "Gbagada", "toluscloset", false, "UK 10"],
  ["Kids' light-up sneakers", "Skechers", "kids", "kids-shoes", 9500, 0, "pre_owned", "Lagos", "Ikeja", "mamatwinsstore", false, "UK 11"],
];

const BULKY = new Set(["home", "appliances"]);

async function allDemoUsers() {
  const { data, error } = await supabase.from("profiles").select("id, username").eq("is_demo", true);
  if (error) throw error;
  return data ?? [];
}

if (process.argv.includes("--remove")) {
  for (const u of await allDemoUsers()) {
    await supabase.auth.admin.deleteUser(u.id);
    console.log("Removed", u.username);
  }
  process.exit(0);
}

const existing = await allDemoUsers();
const ids = Object.fromEntries(existing.map((u) => [u.username, u.id]));

for (const [username, name, city, bio] of STORES) {
  if (ids[username]) continue;
  const { data, error } = await supabase.auth.admin.createUser({
    email: `demo+${username}@example.com`,
    password: randomBytes(24).toString("base64url"), // random and thrown away: nobody can sign in as a demo store
    email_confirm: true,
  });
  if (error) throw error;
  const { error: pErr } = await supabase
    .from("profiles")
    .insert({ id: data.user.id, full_name: name, username, city, bio, is_demo: true });
  if (pErr) throw pErr;
  ids[username] = data.user.id;
  console.log("Created store", name);
}

const { count } = await supabase
  .from("listings")
  .select("id", { count: "exact", head: true })
  .in("seller_id", Object.values(ids));
if (count) {
  console.log(`Demo listings already there (${count}).`);
  process.exit(0);
}

const now = Date.now();
const rows = ITEMS.map(([title, brand, dept, category, price, was, condition, city, area, seller, tested, sizing], i) => ({
  seller_id: ids[seller],
  title,
  brand,
  department: dept,
  category,
  price_kobo: price * 100,
  was_price_kobo: was ? was * 100 : null,
  condition,
  city,
  area,
  tested_working: tested,
  size: BULKY.has(dept) ? null : sizing || null,
  dimensions: BULKY.has(dept) ? sizing || null : null,
  description: "Sample listing for the preview.",
  created_at: new Date(now - i * 3 * 3600_000).toISOString(),
}));
const { error } = await supabase.from("listings").insert(rows);
if (error) throw error;
console.log(`Added ${rows.length} sample listings.`);
