import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Check, ChevronDown, MapPin, Search } from "lucide-react";
import { Command } from "cmdk";
import type { ResourceOption } from "@/types/api";
import { useLanguage } from "@/contexts/LanguageContext";

type MandiComboboxProps = {
  items: ResourceOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  focusRequest?: number;
};

export function MandiCombobox({ items, value, onChange, disabled = false, inputRef, focusRequest = 0 }: MandiComboboxProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const localInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = items.find((item) => item.id === value);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-mandi-combobox]")) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const focusInput = () => {
    setOpen(true);
    window.setTimeout(() => (inputRef?.current ?? localInputRef.current)?.focus(), 0);
  };

  useEffect(() => {
    if (focusRequest > 0) focusInput();
  }, [focusRequest]);

  return (
    <div className="mandi-combobox" data-mandi-combobox>
      <button
        ref={triggerRef}
        className="combobox-trigger"
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-controls="mandi-listbox"
        aria-expanded={open}
        aria-autocomplete="list"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : focusInput())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!open) focusInput();
          }
        }}
      >
        <MapPin size={18} />
        <span className={selected ? "combobox-value" : "combobox-placeholder"}>{selected?.label ?? t("selectMandi")}</span>
        <ChevronDown size={17} />
      </button>
      {open ? (
        <div className="combobox-popover">
          <Command label={t("searchMandi")} className="mandi-command">
            <div className="command-search"><Search size={16} /><Command.Input ref={inputRef ?? localInputRef} placeholder={t("searchMandiPlaceholder")} /></div>
            <Command.List id="mandi-listbox" role="listbox" aria-label={t("searchMandi")}>
              <Command.Empty>{t("noMandiMatches")}</Command.Empty>
              {items.map((item) => (
                  <Command.Item
                    key={item.id}
                    role="option"
                    aria-selected={item.id === value}
                  value={`${item.label} ${item.id}`}
                  onSelect={() => { onChange(item.id); setOpen(false); }}
                >
                  <span>{item.label}</span>
                  {item.id === value ? <Check size={16} /> : null}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </div>
      ) : null}
    </div>
  );
}
