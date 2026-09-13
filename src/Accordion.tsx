import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

// Context cấp root: lưu panel đang mở + hàm toggle
interface AccordionContextType {
  activeValue: string | null;
  toggle: (value: string) => void;
}

const AccordionContext = createContext<AccordionContextType | null>(null);

function useAccordionContext(): AccordionContextType {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error("Accordion sub-components phải nằm trong <Accordion>");
  }
  return context;
}

// Context cấp Item: để Header & Panel biết mình thuộc value nào
interface ItemContextType {
  value: string;
}

const ItemContext = createContext<ItemContextType | null>(null);

function useItemContext(): ItemContextType {
  const context = useContext(ItemContext);
  if (!context) {
    throw new Error("Header/Panel phải nằm trong <Accordion.Item>");
  }
  return context;
}

// --- Sub-components ---

interface AccordionItemProps {
  value: string;
  children: ReactNode;
}

function AccordionItem({ value, children }: AccordionItemProps) {
  const { activeValue } = useAccordionContext();
  const isOpen = activeValue === value;

  return (
    <ItemContext.Provider value={{ value }}>
      <div
        className={`accordion-item ${isOpen ? "accordion-item--open" : ""}`}
        data-value={value}
      >
        {children}
      </div>
    </ItemContext.Provider>
  );
}

interface AccordionHeaderProps {
  children: ReactNode;
}

function AccordionHeader({ children }: AccordionHeaderProps) {
  const { activeValue, toggle } = useAccordionContext();
  const { value } = useItemContext();
  const isOpen = activeValue === value;

  return (
    <button
      className="accordion-header"
      onClick={() => toggle(value)}
      aria-expanded={isOpen}
      aria-controls={`accordion-panel-${value}`}
    >
      <span className="accordion-header__title">{children}</span>
      <span
        className={`accordion-header__icon ${isOpen ? "accordion-header__icon--open" : ""}`}
        aria-hidden="true"
      >
        ▸
      </span>
    </button>
  );
}

interface AccordionPanelProps {
  children: ReactNode;
}

function AccordionPanel({ children }: AccordionPanelProps) {
  const { activeValue } = useAccordionContext();
  const { value } = useItemContext();
  const isOpen = activeValue === value;

  return (
    <div
      className={`accordion-panel ${isOpen ? "accordion-panel--open" : ""}`}
      id={`accordion-panel-${value}`}
      role="region"
      aria-hidden={!isOpen}
    >
      {isOpen && <div className="accordion-panel__content">{children}</div>}
    </div>
  );
}

// --- Root component ---

interface AccordionProps {
  defaultValue?: string;
  children: ReactNode;
}

function Accordion({ defaultValue, children }: AccordionProps) {
  const [activeValue, setActiveValue] = useState<string | null>(
    defaultValue ?? null
  );

  // Click panel đang mở → đóng (null), click panel khác → mở nó
  const toggle = useCallback((value: string) => {
    setActiveValue((prev: string | null) => (prev === value ? null : value));
  }, []);

  return (
    <AccordionContext.Provider value={{ activeValue, toggle }}>
      <div className="accordion">{children}</div>
    </AccordionContext.Provider>
  );
}

// Gắn sub-component theo Compound Component pattern
Accordion.Item = AccordionItem;
Accordion.Header = AccordionHeader;
Accordion.Panel = AccordionPanel;

export default Accordion;
