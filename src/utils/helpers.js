export const toProperCase = (s) =>
  s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());

export const uid = () => Math.random().toString(36).slice(2, 10);

export const canSplitDepth = (w) => w === 3 || w === 6;

export const getDepthSlots = (d) =>
  d === "half" ? [0, 1] : d === "third" ? [0, 1, 2] : [0];

export const getSlotLabel = (d, i) => {
  if (d === "full") return "";
  if (d === "half") return i === 0 ? "Front" : "Back";
  return i === 0 ? "Front" : i === 1 ? "Mid" : "Back";
};

export const loadData = (key, fb) => {
  try {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : fb;
  } catch {
    return fb;
  }
};

export const saveData = (key, v) => {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
};
