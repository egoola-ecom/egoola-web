"use client";

import { useEffect, useState } from "react";

/** One slide at a time with dots, using the legacy Owl Carousel markup and
 * classes so the legacy CSS styles it. The slider itself is plain React. */
export function OwlCarousel({
  children,
  className = "",
  autoplayMs = 0,
  showDots = true,
  id,
}: {
  children: React.ReactNode[];
  className?: string;
  autoplayMs?: number;
  showDots?: boolean;
  id?: string;
}) {
  const slides = Array.isArray(children) ? children : [children];
  const count = slides.length;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!autoplayMs || count < 2) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), autoplayMs);
    return () => window.clearInterval(timer);
  }, [autoplayMs, count]);

  return (
    <div id={id} className={`owl-carousel owl-theme owl-loaded owl-drag ${className}`} style={{ display: "block" }}>
      <div className="owl-stage-outer" style={{ overflow: "hidden" }}>
        <div
          className="owl-stage"
          style={{
            width: `${count * 100}%`,
            display: "flex",
            transform: `translateX(-${(index * 100) / count}%)`,
            transition: "transform .4s ease",
          }}
        >
          {slides.map((slide, i) => (
            <div key={i} className={`owl-item ${i === index ? "active" : ""}`} style={{ width: `${100 / count}%`, float: "none" }}>
              {slide}
            </div>
          ))}
        </div>
      </div>
      {showDots && count > 1 && (
        <div className="owl-dots">
          {slides.map((_, i) => (
            <button key={i} type="button" className={`owl-dot ${i === index ? "active" : ""}`} aria-label={`Slide ${i + 1}`} onClick={() => setIndex(i)}>
              <span />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
