import { useState, useEffect } from "react";

// Mobile means a phone-sized screen, or a touch screen under laptop width
// (a phone held sideways). A narrow laptop window with a mouse stays desktop.
const read = () => {
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const w = window.innerWidth;
  return {
    isMobile: w < 768 || (coarse && w < 1024),
    isPortrait: window.innerHeight > w,
  };
};

export function useIsMobile() {
  const [state, setState] = useState(read);
  useEffect(() => {
    const h = () => setState(read());
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return state;
}
