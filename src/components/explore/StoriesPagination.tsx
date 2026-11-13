import React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface StoriesPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const StoriesPagination = ({ currentPage, totalPages, onPageChange }: StoriesPaginationProps) => {
  // Create array of page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // If we have 5 or fewer pages, show all page numbers
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always include first page
      pages.push(1);

      // Calculate start and end of the displayed range
      let rangeStart = Math.max(2, currentPage - 1);
      let rangeEnd = Math.min(totalPages - 1, currentPage + 1);

      // Adjust the range to always show 3 page numbers in the middle when possible
      if (rangeEnd - rangeStart + 1 < 3) {
        if (currentPage < totalPages / 2) {
          rangeEnd = Math.min(totalPages - 1, rangeStart + 2);
        } else {
          rangeStart = Math.max(2, rangeEnd - 2);
        }
      }

      // Add ellipsis before middle pages if needed
      if (rangeStart > 2) {
        pages.push(-1); // Use -1 to represent ellipsis
      }

      // Add the middle page numbers
      for (let i = rangeStart; i <= rangeEnd; i++) {
        pages.push(i);
      }

      // Add ellipsis after middle pages if needed
      if (rangeEnd < totalPages - 1) {
        pages.push(-2); // Use -2 to represent ellipsis
      }

      // Always include last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <Pagination>
      <PaginationContent>
        {/* Previous button */}
        <PaginationItem className="order-3 sm:order-1 mt-2 sm:mt-0 flex-1 sm:flex-none flex justify-end sm:justify-start pr-1 sm:pr-0">
          <PaginationPrevious
            onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
            className={cn(
              "h-9 sm:h-8 px-2.5 rounded-sm border border-border/70 text-xs font-mono transition-colors",
              currentPage === 1 ? "pointer-events-none opacity-40" : "cursor-pointer text-foreground hover:bg-muted"
            )}
            tabIndex={currentPage === 1 ? -1 : 0}
          />
        </PaginationItem>

        {/* Page numbers */}
        {getPageNumbers().map((pageNum, index) => (
          <PaginationItem key={index} className="order-1 sm:order-2">
            {pageNum < 0 ? (
              <span className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center text-muted-foreground text-xs font-mono tabular-nums">…</span>
            ) : (
              <PaginationLink
                isActive={pageNum === currentPage}
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  "h-9 w-9 sm:h-8 sm:w-8 p-0 text-xs font-mono font-medium tabular-nums flex items-center justify-center rounded-sm transition-colors cursor-pointer border",
                  pageNum === currentPage
                    ? "bg-primary text-primary-foreground border-primary shadow-xs hover:bg-primary/90"
                    : "border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {pageNum}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        {/* Break element to push previous/next to bottom row on mobile */}
        <li className="basis-full h-0 sm:hidden order-2 mb-2" aria-hidden="true" />

        {/* Next button */}
        <PaginationItem className="order-4 sm:order-3 mt-2 sm:mt-0 flex-1 sm:flex-none flex justify-start pl-1 sm:pl-0">
          <PaginationNext
            onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
            className={cn(
              "h-9 sm:h-8 px-2.5 rounded-sm border border-border/70 text-xs font-mono transition-colors",
              currentPage === totalPages ? "pointer-events-none opacity-40" : "cursor-pointer text-foreground hover:bg-muted"
            )}
            tabIndex={currentPage === totalPages ? -1 : 0}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default StoriesPagination;
