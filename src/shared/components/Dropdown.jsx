import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function Dropdown({ ariaLabel, className = "", onChange, options, value }) {
  const dropdownId = useId();
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) setActiveIndex(selectedIndex);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePointer = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  const chooseOption = (index) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setActiveIndex(selectedIndex);
        setOpen(true);
        return;
      }
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + direction + options.length) % options.length);
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      if (!open) return;
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : options.length - 1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        setActiveIndex(selectedIndex);
        setOpen(true);
      } else {
        chooseOption(activeIndex);
      }
    }
  };

  const selectedOption = options[selectedIndex];
  const activeOptionId = `${dropdownId}-option-${activeIndex}`;

  return (
    <div className={`custom-dropdown ${className}`.trim()} ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        className="custom-dropdown-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${dropdownId}-listbox`}
        aria-activedescendant={open ? activeOptionId : undefined}
        onClick={() => {
          setOpen((current) => !current);
          setActiveIndex(selectedIndex);
        }}
        onKeyDown={handleKeyDown}
      >
        <span className="custom-dropdown-value">{selectedOption?.label || ""}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={`${dropdownId}-listbox`}
          className="custom-dropdown-menu"
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              id={`${dropdownId}-option-${index}`}
              type="button"
              role="option"
              className={`custom-dropdown-option${index === activeIndex ? " active" : ""}`}
              aria-selected={option.value === value}
              onPointerDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => chooseOption(index)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
