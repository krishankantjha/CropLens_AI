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
};

export function MandiCombobox({ items, value, onChange, disabled = false, inputRef }: MandiComboboxProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const localInputRef = useRef<HTMLInputElement>(null);
  const selected = items.find((item) => item.id === value);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-mandi-combobox]")) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const focusInput = () => {
    setOpen(true);
    window.setTimeout(() => (inputRef?.current ?? localInputRef.current)?.focus(), 0);
  };

  return (
    <div className="mandi-combobox" data-mandi-combobox>
      <button
        className="combobox-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : focusInput())}
      >
        <MapPin size={18} />
        <span className={selected ? "combobox-value" : "combobox-placeholder"}>{selected?.label ?? t("selectMandi")}</span>
        <ChevronDown size={17} />
      </button>
      {open ? (
        <div className="combobox-popover">
          <Command label={t("searchMandi")} className="mandi-command">
            <div className="command-search"><Search size={16} /><Command.Input ref={inputRef ?? localInputRef} placeholder={t("searchMandiPlaceholder")} /></div>
            <Command.List>
              <Command.Empty>{t("noMandiMatches")}</Command.Empty>
              {items.map((item) => (
                <Command.Item
                  key={item.id}
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
