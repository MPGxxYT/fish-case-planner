import { useState, useEffect } from "react";
import { loadData, saveData } from "../utils/helpers.js";

export function useLocalStorage(key, fallback, migrate) {
  const [value, setValue] = useState(() => {
    const raw = loadData(key, fallback);
    return migrate ? migrate(raw) : raw;
  });

  useEffect(() => {
    saveData(key, value);
  }, [key, value]);

  return [value, setValue];
}
