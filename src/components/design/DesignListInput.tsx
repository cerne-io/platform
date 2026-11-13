import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X, List, AlignLeft } from "lucide-react";

interface DesignListInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mode?: "list" | "text";
  onModeChange?: (mode: "list" | "text") => void;
  disabled?: boolean;
}

// Parse items from string
// Handles typical markdown lists from the AI too (-, *, etc)
const parseItems = (str: string): string[] => {
  if (!str) return [];
  return str
    .split(/\n\n|\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.replace(/^[-*]\s+/, '')); // strip bullet points
};

const DesignListInput: React.FC<DesignListInputProps> = ({ 
  id, 
  value, 
  onChange, 
  placeholder = "Enter an item...",
  mode = "list",
  onModeChange,
  disabled = false
}) => {
  const [isListMode, setIsListMode] = useState(mode === "list");

  useEffect(() => {
    setIsListMode(mode === "list");
  }, [mode]);

  const [items, setItems] = useState<string[]>(parseItems(value));

  // Sync incoming value changes (e.g. from DB) if we haven't touched it recently
  useEffect(() => {
     if (isListMode) {
       const parsed = parseItems(value);
       // Filter out empty items from current state to compare against parsed value
       // This prevents removing newly added empty items or items currently being cleared
       const activeItems = items.filter(item => item.trim().length > 0);
       
       if (JSON.stringify(parsed) !== JSON.stringify(activeItems)) {
         setItems(parsed);
       }
     }
  }, [value, isListMode, items]);

  const updateValueFromItems = (newItems: string[]) => {
    setItems(newItems);
    onChange(newItems.join('\n\n'));
  };

  const handleItemChange = (index: number, newValue: string) => {
    const newItems = [...items];
    newItems[index] = newValue;
    updateValueFromItems(newItems);
  };

  const handleAddItem = () => {
    updateValueFromItems([...items, ""]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    updateValueFromItems(newItems);
  };

  const toggleMode = () => {
    if (isListMode) {
      setIsListMode(false);
      if (onModeChange) onModeChange("text");
    } else {
      setItems(parseItems(value));
      setIsListMode(true);
      if (onModeChange) onModeChange("list");
    }
  };

  if (!isListMode) {
    return (
      <div className="space-y-2 w-full">
        {onModeChange && !disabled && (
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={toggleMode} className="h-8 text-xs text-[#5D3FD3] dark:text-[#9D7CFF] hover:bg-[#5D3FD3]/10 dark:hover:bg-[#9D7CFF]/10">
              <List className="w-3.5 h-3.5 mr-1" />
              Switch to List
            </Button>
          </div>
        )}
        <Textarea
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          className="w-full"
          placeholder={placeholder || "Enter text here..."}
        />
      </div>
    );
  }

  // List mode
  return (
    <div className="space-y-3 w-full">
      {!disabled && (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={toggleMode} className="h-8 text-xs text-[#5D3FD3] dark:text-[#9D7CFF] hover:bg-[#5D3FD3]/10 dark:hover:bg-[#9D7CFF]/10">
            <AlignLeft className="w-3.5 h-3.5 mr-1" />
            Switch to Freeform Text
          </Button>
        </div>
      )}
      
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-sm text-slate-500 italic py-2">No items listed yet.</div>
        ) : (
          items.map((item, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  value={item}
                  disabled={disabled}
                  onChange={(e) => handleItemChange(index, e.target.value)}
                  placeholder={placeholder}
                  className="w-full"
                />
              </div>
              {!disabled && (
                <Button 
                  type="button"
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleRemoveItem(index)}
                  className="text-slate-400 hover:text-red-500"
                  aria-label="Remove item"
                  title="Remove item"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>
      {!disabled && (
        <Button 
          type="button"
          variant="outline" 
          size="sm" 
          onClick={handleAddItem}
          className="text-[#5D3FD3] dark:text-[#9D7CFF] border-[#5D3FD3]/20 dark:border-[#9D7CFF]/30 hover:bg-[#5D3FD3]/5 dark:hover:bg-[#9D7CFF]/10 transition-colors"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Item
        </Button>
      )}
    </div>
  );
};

export default DesignListInput;
