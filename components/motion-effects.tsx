"use client";

import { useEffect } from "react";

export default function MotionEffects() {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const motionAllowed = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!motionAllowed || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12 });

    for (const element of elements) {
      if (element.getBoundingClientRect().top < window.innerHeight * 0.9) {
        element.classList.add("is-visible");
      } else {
        observer.observe(element);
      }
    }
    document.documentElement.classList.add("motion-ready");

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("motion-ready");
    };
  }, []);

  return null;
}
