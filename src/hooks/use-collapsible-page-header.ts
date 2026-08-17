import { useEffect, useRef, type UIEvent } from "react";

/** Keeps the primary page title visible while smoothly collapsing its subtitle on scroll. */
export function useCollapsiblePageHeader() {
  const headerRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  const handleContentScroll = (event: UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const maxScrollTop = container.scrollHeight - container.clientHeight;

    if (maxScrollTop < 112) {
      return;
    }

    scrollProgressRef.current = Math.min(event.currentTarget.scrollTop / 112, 1);

    if (scrollFrameRef.current !== null) return;

    scrollFrameRef.current = requestAnimationFrame(() => {
      const progress = scrollProgressRef.current;
      const header = headerRef.current;
      const description = descriptionRef.current;

      if (header) {
        header.style.paddingTop = `${8 + 4 * (1 - progress)}px`;
        header.style.paddingBottom = `${8 + 4 * (1 - progress)}px`;
      }

      if (description) {
        description.style.maxHeight = `${description.scrollHeight * (1 - progress)}px`;
        description.style.opacity = `${1 - progress}`;
        description.style.transform = `translateY(${-8 * progress}px)`;
        description.style.pointerEvents = progress > 0.98 ? "none" : "auto";
      }

      scrollFrameRef.current = null;
    });
  };

  return { headerRef, descriptionRef, handleContentScroll };
}
