const FILE_VERSION = 1;
const FILE_EXT = ".fishcase";

export const exportCaseToFile = (savedCase, products) => {
  const usedProductIds = new Set();
  for (const pan of savedCase.pans) {
    for (const pid of Object.values(pan.slots)) {
      if (pid) usedProductIds.add(pid);
    }
  }
  const usedProducts = products.filter((p) => usedProductIds.has(p.id));

  const payload = {
    version: FILE_VERSION,
    exportedAt: new Date().toISOString(),
    case: {
      name: savedCase.name,
      caseWidth: savedCase.caseWidth,
      pans: savedCase.pans,
      savedAt: savedCase.savedAt,
    },
    products: usedProducts,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${savedCase.name.replace(/[^a-zA-Z0-9_ -]/g, "")}${FILE_EXT}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportCurrentCaseToFile = (name, pans, caseWidth, products) => {
  exportCaseToFile(
    { name, pans, caseWidth, savedAt: new Date().toISOString() },
    products,
  );
};

const VALID_WIDTHS = new Set([3, 6, 8, 12]);
const VALID_DEPTHS = new Set(["full", "half", "third"]);
const VALID_PAN_TYPES = new Set(["deep", "shallow"]);

const validateImport = (data) => {
  if (!data || typeof data !== "object") return "File is not valid JSON.";
  if (typeof data.version !== "number") return "Missing file version.";
  if (!data.case) return "Missing case data.";
  const c = data.case;
  if (!c.name || typeof c.name !== "string") return "Case is missing a name.";
  if (!Number.isInteger(c.caseWidth) || c.caseWidth < 1) return "Invalid case width.";
  if (!Array.isArray(c.pans)) return "Case is missing pans array.";
  for (let i = 0; i < c.pans.length; i++) {
    const pan = c.pans[i];
    if (!pan.id || !VALID_WIDTHS.has(pan.width)) return `Pan ${i + 1} has an invalid width.`;
    if (!VALID_DEPTHS.has(pan.depth)) return `Pan ${i + 1} has an invalid depth.`;
    if (!VALID_PAN_TYPES.has(pan.panType)) return `Pan ${i + 1} has an invalid pan type.`;
    if (!pan.slots || typeof pan.slots !== "object") return `Pan ${i + 1} is missing slots.`;
  }
  if (!Array.isArray(data.products)) return "Missing products array.";
  for (let i = 0; i < data.products.length; i++) {
    const p = data.products[i];
    if (!p.id || !p.name) return `Product ${i + 1} is missing id or name.`;
  }
  return null;
};

export const readCaseFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const error = validateImport(data);
        if (error) return reject(new Error(error));
        resolve(data);
      } catch {
        reject(new Error("Could not parse file. Make sure it's a valid .fishcase file."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
};
