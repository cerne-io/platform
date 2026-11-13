import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  List,
  Search,
  BookmarkCheck,
  X,
} from "lucide-react";

interface SearchFilterProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  view: "grid" | "list";
  setView: (view: "grid" | "list") => void;
  filter: "all" | "positive" | "neutral" | "negative" | "saved";
  setFilter: (
    filter: "all" | "positive" | "neutral" | "negative" | "saved",
  ) => void;
}

const SearchFilter = ({
  searchTerm,
  setSearchTerm,
  view,
  setView,
  filter,
  setFilter,
}: SearchFilterProps) => {
  const filterOptions: Array<{ id: SearchFilterProps["filter"]; label: string; icon?: React.ReactNode }> = [
    { id: "all", label: "All" },
    { id: "positive", label: "Positive" },
    { id: "neutral", label: "Neutral" },
    { id: "negative", label: "Negative" },
    { id: "saved", label: "Saved", icon: <BookmarkCheck className="h-3 w-3" /> },
  ];

  return (
    <div className="my-6 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="search"
            aria-label="Search entries"
            placeholder="Search entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 bg-card border-border/80 shadow-xs focus-visible:ring-primary/20 rounded-lg text-foreground placeholder:text-muted-foreground"
            data-tour="explore-search-input"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors"
              aria-label="Clear search"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5" role="group" aria-label="View options">
          <Button
            variant={view === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setView("grid")}
            aria-label="Grid view"
            title="Grid view"
            aria-pressed={view === "grid"}
            data-tour="explore-view-grid"
            className="rounded-lg active:scale-95 transition-transform"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setView("list")}
            aria-label="List view"
            title="List view"
            aria-pressed={view === "list"}
            data-tour="explore-view-list"
            className="rounded-lg active:scale-95 transition-transform"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Sentiment Filter Pills */}
        {filterOptions.map(({ id, label, icon }) => {
          const isSelected = filter === id;
          return (
            <Badge
              key={id}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer select-none px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 flex items-center gap-1.5",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-xs border-transparent"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70",
              )}
              onClick={() => setFilter(id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setFilter(id);
                }
              }}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              data-tour={`explore-filter-${id}`}
            >
              {icon}
              {label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
};

export default SearchFilter;
