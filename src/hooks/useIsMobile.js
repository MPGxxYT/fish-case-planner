import { useState, useEffect } from "react";

export function useIsMobile() {
  const [state, setState] = useState(() => ({
    isMobile: window.innerWidth < 1024,
    isPortrait: window.innerHeight > window.innerWidth,
  }));
  useEffect(() => {
    const h = () => setState({
      isMobile: window.innerWidth < 1024,
      isPortrait: window.innerHeight > window.innerWidth,
    });
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return state;
}
