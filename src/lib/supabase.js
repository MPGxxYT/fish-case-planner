import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

function generateShortCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getUsedProducts(pans, products) {
  const usedIds = new Set();
  for (const pan of pans) {
    for (const pid of Object.values(pan.slots)) {
      if (pid) usedIds.add(pid);
    }
  }
  return products.filter((p) => usedIds.has(p.id));
}

export async function publishCase(name, author, pans, products, caseWidth) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const usedProducts = getUsedProducts(pans, products);

  // Try up to 3 times in case of short code collision
  for (let attempt = 0; attempt < 3; attempt++) {
    const shortCode = generateShortCode();
    const { data, error } = await supabase
      .from("published_cases")
      .insert({
        short_code: shortCode,
        name,
        author: author || "",
        case_width: caseWidth,
        pans,
        products: usedProducts,
      })
      .select("short_code")
      .single();

    if (error) {
      // Unique violation on short_code — retry
      if (error.code === "23505") continue;
      throw new Error(error.message);
    }
    return { shortCode: data.short_code };
  }
  throw new Error("Failed to generate a unique code. Please try again.");
}

const PAGE_SIZE = 20;

export async function fetchPublicCases(page = 0) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE;

  const { data, error, count } = await supabase
    .from("published_cases")
    .select("short_code, name, author, case_width, pans, products, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    cases: data.map((row) => ({
      shortCode: row.short_code,
      name: row.name,
      author: row.author,
      caseWidth: row.case_width,
      pans: row.pans,
      products: row.products,
      createdAt: row.created_at,
    })),
    hasMore: count > to + 1,
  };
}

export async function fetchCaseByCode(code) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("published_cases")
    .select("short_code, name, author, case_width, pans, products, created_at")
    .eq("short_code", code.toUpperCase().trim())
    .single();

  if (error) {
    if (error.code === "PGRST116") throw new Error(`No case found with code "${code}".`);
    throw new Error(error.message);
  }

  return {
    shortCode: data.short_code,
    name: data.name,
    author: data.author,
    caseWidth: data.case_width,
    pans: data.pans,
    products: data.products,
    createdAt: data.created_at,
  };
}
