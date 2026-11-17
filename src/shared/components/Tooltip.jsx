import { cloneElement, useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function Tooltip({ children, label, className = "", portal = false }) {
  const tooltipId = useId();
  const describedBy = [children.props["aria-describedby"], tooltipId].filter(Boolean).join(" ");
  const anchorRef = useRef(null);
  const tooltipRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(null);
  const updateTooltipPosition = useCallback(() => {
    const anchorRect = anchorRef.current?.getBoundingClientRect();
    const tooltipRect = tooltipRef.current?.getBoundingClientRect();
    if (!anchorRect || !tooltipRect) return;

    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - tooltipRect.width - margin);
    const left = Math.min(
      maxLeft,
      Math.max(margin, anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2),
    );
    setTooltipPosition({
      top: Math.max(margin, anchorRect.top - tooltipRect.height - margin),
      left,
    });
  }, []);

  useLayoutEffect(() => {
    if (!portal || !isVisible) return undefined;

    updateTooltipPosition();
    window.addEventListener("resize", updateTooltipPosition);
    window.addEventListener("scroll", updateTooltipPosition, true);
    return () => {
      window.removeEventListener("resize", updateTooltipPosition);
      window.removeEventListener("scroll", updateTooltipPosition, true);
    };
  }, [isVisible, portal, updateTooltipPosition]);

  const tooltip = (
    <span
      ref={portal ? tooltipRef : undefined}
      id={tooltipId}
      role="tooltip"
      className={`app-tooltip${portal ? ` app-tooltip-portal${isVisible ? " app-tooltip-visible" : ""}` : ""}`}
      style={
        portal
          ? {
              position: "fixed",
              ...(tooltipPosition ?? { top: 0, left: 0, visibility: "hidden" }),
            }
          : undefined
      }
    >
      {label}
    </span>
  );

  return (
    <span
      ref={anchorRef}
      className={`app-tooltip-anchor ${className}`.trim()}
      onMouseEnter={portal ? () => setIsVisible(true) : undefined}
      onMouseLeave={portal ? () => setIsVisible(false) : undefined}
      onFocus={
        portal
          ? (event) => {
              if (event.target.matches(":focus-visible")) setIsVisible(true);
            }
          : undefined
      }
      onBlur={portal ? () => setIsVisible(false) : undefined}
    >
      {cloneElement(children, { "aria-describedby": describedBy })}
      {portal ? createPortal(tooltip, document.body) : tooltip}
    </span>
  );
}

export default Tooltip;
