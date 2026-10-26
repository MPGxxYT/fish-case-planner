import { placedProducts } from "../case/queries.js";
import { readSavedCase } from "../case/savedCase.js";

const FILE_VERSION = 1;
const FILE_EXT = ".fishcase";

export const exportCaseToFile = (savedCase, products) => {
  const usedProducts = placedProducts(savedCase.pans, products);

  const payload = {
    version: FILE_VERSION,
    exportedAt: new Date().toISOString(),
    case: {
      name: savedCase.name,
      caseWidth: savedCase.caseWidth,
      pans: savedCase.pans,
      dividers: savedCase.dividers || [],
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

// The .fishcase wrapper (version, products) is checked here; the case itself by readSavedCase.
const readImport = (data) => {
  if (!data || typeof data !== "object") return { error: "File is not valid JSON." };
  if (typeof data.version !== "number") return { error: "Missing file version." };
  if (!Array.isArray(data.products)) return { error: "Missing products array." };
  for (let i = 0; i < data.products.length; i++) {
    const p = data.products[i];
    if (!p.id || !p.name) return { error: `Product ${i + 1} is missing id or name.` };
  }
  const { case: savedCase, error } = readSavedCase(data.case);
  return error ? { error } : { data: { ...data, case: savedCase } };
};

export const readCaseFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const { data: checked, error } = readImport(data);
        if (error) return reject(new Error(error));
        resolve(checked);
      } catch {
        reject(new Error("Could not parse file. Make sure it's a valid .fishcase file."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
};
