import React from "react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { TextTooltip } from "@/components/ui/text-tooltip";

export const MEDOID_TOOLTIP_TEXT =
  "The story is the mathematical medoid, ie, the story whose narrative is closest on average to all other stories in this neighbourhood — an exploratory starting point, not an executive summary or representative voice.";

export const EXPLORATORY_VIEW_TOOLTIP_TEXT =
  "This is a machine-suggested grouping, not a validated theme. The examples below are selected to show centre, edge, and contrast; they do not stand for every story in the group.";

export const EXPLORATORY_BROAD_TOOLTIP_TEXT =
  "This is a machine-suggested shared-language field, not a validated theme. The examples below are selected to show centre, edge, and contrast; they do not stand for every story in the group.";

export interface MarkdownOptions {
  onEvidenceClick?: (evidenceId: string) => void;
}

/**
 * Parses inline formatting: **bold**, *italic*, (Stories X-Y) citation badges, medoid info tooltips, and exploratory view tooltips
 */
export const renderInlineMarkdown = (text: string, options?: MarkdownOptions): React.ReactNode => {
  if (!text) return null;

  // Normalize "Entry story (i)" to medoid token
  if (text.includes("Entry story (i)") || text.includes("Entry story(i)")) {
    const normalized = text.replace(/Entry story\s*\(i\)(\*\*)?/gi, (match, p1) => {
      return p1 ? `Entry story** {{medoid_info}}` : `Entry story {{medoid_info}}`;
    });
    return renderInlineMarkdown(normalized, options);
  }

  // Normalize "Exploratory view (i)" to exploratory token
  if (text.includes("Exploratory view (i)") || text.includes("Exploratory view(i)")) {
    const normalized = text.replace(/Exploratory view\s*\(i\)(\*\*)?/gi, (match, p1) => {
      return p1 ? `Exploratory view** {{exploratory_info}}` : `Exploratory view {{exploratory_info}}`;
    });
    return renderInlineMarkdown(normalized, options);
  }

  // Handle {{medoid_info}} tooltip token
  if (text.includes("{{medoid_info}}")) {
    const parts = text.split("{{medoid_info}}");
    return parts.map((part, index) => (
      <React.Fragment key={`medoid-${index}`}>
        {renderInlineMarkdown(part, options)}
        {index < parts.length - 1 && (
          <InfoTooltip
            contentKey="medoid-info"
            content={MEDOID_TOOLTIP_TEXT}
            size={13}
            className="inline-flex ml-1 text-[#5D3FD3] dark:text-[#9D7CFF] align-middle"
          />
        )}
      </React.Fragment>
    ));
  }

  // Handle {{exploratory_info}} tooltip token
  if (text.includes("{{exploratory_info}}")) {
    const parts = text.split("{{exploratory_info}}");
    const isBroad = text.toLowerCase().includes("broad grouping") || text.toLowerCase().includes("shared-language");
    const tooltipText = isBroad ? EXPLORATORY_BROAD_TOOLTIP_TEXT : EXPLORATORY_VIEW_TOOLTIP_TEXT;

    return parts.map((part, index) => (
      <React.Fragment key={`exploratory-${index}`}>
        {renderInlineMarkdown(part, options)}
        {index < parts.length - 1 && (
          <InfoTooltip
            contentKey="exploratory-view-info"
            content={tooltipText}
            size={13}
            className="inline-flex ml-1 text-[#5D3FD3] dark:text-[#9D7CFF] align-middle"
          />
        )}
      </React.Fragment>
    ));
  }

  // Split by bold (**text**)
  const boldParts = text.split(/(\*\*.*?\*\*)/g);

  return boldParts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      const boldContent = part.slice(2, -2);
      return (
        <strong key={`bold-${index}`} className="font-semibold">
          {renderItalicAndCitations(boldContent, index, options)}
        </strong>
      );
    }
    return renderItalicAndCitations(part, index, options);
  });
};


const GLOSSARY_TERMS: Record<string, string> = {
  "secondary anchors": "A highly similar item retained to broaden the local neighbourhood",
  "secondary anchor": "A highly similar item retained to broaden the local neighbourhood",
  "semantic contrasts": "A deliberately included item that differs along a retrieved semantic direction",
  "semantic contrast": "A deliberately included item that differs along a retrieved semantic direction",
  "edge cases": "A low-confidence or boundary item retained to test the coherence of the neighbourhood",
  "edge case": "A low-confidence or boundary item retained to test the coherence of the neighbourhood",
  "anchors": "The starting card or query-nearest card",
  "anchor": "The starting card or query-nearest card",
};

const GLOSSARY_REGEX = new RegExp(
  `\\b(${Object.keys(GLOSSARY_TERMS).join("|")})\\b`,
  "gi"
);

const renderGlossaryTerms = (text: string, parentKey: string): React.ReactNode => {
  if (!text) return null;
  const parts = text.split(GLOSSARY_REGEX);

  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    const lowerPart = part.toLowerCase();
    if (GLOSSARY_TERMS[lowerPart]) {
      return (
        <TextTooltip
          key={`glossary-${parentKey}-${i}`}
          text={part}
          content={GLOSSARY_TERMS[lowerPart]}
        />
      );
    }
    return part;
  });
};

/**
 * Processes italics and (Story 1) / (Stories 1-3) citations
 */
const renderItalicAndCitations = (text: string, parentIndex: number | string, options?: MarkdownOptions): React.ReactNode => {
  if (!text) return null;

  // Check for story citation patterns like (Story 1) or evidence citations like evidence_1a61
  const citationRegex = /(\((?:Stories|Story)\s+[\d\s,-]+\)|evidence_[a-f0-9]+)/gi;
  const citationParts = text.split(citationRegex);

  return citationParts.map((cPart, cIndex) => {
    if (/^\((?:Stories|Story)\s+[\d\s,-]+\)$/i.test(cPart)) {
      return (
        <span
          key={`cite-${parentIndex}-${cIndex}`}
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 text-[10px] font-medium rounded-full bg-[#5D3FD3]/10 text-[#5D3FD3] dark:text-[#9D7CFF] dark:bg-[#9D7CFF]/15 border border-[#5D3FD3]/20"
        >
          {cPart.slice(1, -1)}
        </span>
      );
    }
    
    if (/^evidence_[a-f0-9]+$/i.test(cPart)) {
      const isClickable = !!options?.onEvidenceClick;
      return (
        <span
          key={`evidence-${parentIndex}-${cIndex}`}
          onClick={() => isClickable && options.onEvidenceClick!(cPart)}
          className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 text-[10px] font-medium rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 ${isClickable ? 'cursor-pointer hover:bg-emerald-500/20 transition-colors' : ''}`}
        >
          {cPart}
        </span>
      );
    }

    // In GFM, underscores only denote emphasis when not surrounded by word characters (avoids snake_case_variables)
    const italicRegex = /(\*(?:[^*]+)\*|(?<!\w)_(?:[^_]+)_(?!\w))/g;
    const italicParts = cPart.split(italicRegex);
    return italicParts.map((part, iIndex) => {
      const key = `italic-${parentIndex}-${cIndex}-${iIndex}`;
      if (
        (part.startsWith("*") && part.endsWith("*") && part.length > 2) ||
        (part.startsWith("_") && part.endsWith("_") && part.length > 2)
      ) {
        return (
          <em key={key} className="italic text-inherit">
            {renderGlossaryTerms(part.slice(1, -1), key)}
          </em>
        );
      }
      return renderGlossaryTerms(part, key);
    });
  });
};

/**
 * Checks if a line resembles a Markdown table row with pipes
 */
const isTableRow = (line: string): boolean => {
  const t = line.trim();
  if (!t.includes("|")) return false;
  const content = t.replace(/^\|/, "").replace(/\|$/, "");
  return content.split("|").length >= 2;
};

/**
 * Checks if a line is a Markdown table delimiter row (| --- | :---: |)
 */
const isTableDelimiterRow = (line: string): boolean => {
  const t = line.trim();
  if (!t.includes("|")) return false;
  const content = t.replace(/^\|/, "").replace(/\|$/, "");
  const cells = content.split("|");
  if (cells.length === 0) return false;
  return cells.every((c) => /^\s*:?-{2,}:?\s*$/.test(c));
};

/**
 * Extracts trimmed cell strings from a pipe-delimited table line
 */
const parseTableCells = (line: string): string[] => {
  const t = line.trim();
  const content = t.replace(/^\|/, "").replace(/\|$/, "");
  return content.split("|").map((c) => c.trim());
};

/**
 * Derives column text alignment from delimiter cells
 */
const getColumnAlignments = (delimiterLine: string): Array<"left" | "center" | "right"> => {
  const cells = parseTableCells(delimiterLine);
  return cells.map((cell) => {
    const trimmed = cell.trim();
    const starts = trimmed.startsWith(":");
    const ends = trimmed.endsWith(":");
    if (starts && ends) return "center";
    if (ends) return "right";
    return "left";
  });
};

function parseAndRenderTable(lines: string[], startIndex: number, elements: React.ReactNode[], options?: MarkdownOptions): number {
  const rawLine = lines[startIndex];
  let nextIdx = startIndex + 1;
  while (nextIdx < lines.length && !lines[nextIdx].trim()) {
    nextIdx++;
  }

  if (nextIdx < lines.length && isTableDelimiterRow(lines[nextIdx])) {
    const headerCells = parseTableCells(rawLine);
    const alignments = getColumnAlignments(lines[nextIdx]);
    const rows: string[][] = [];

    let curIdx = nextIdx + 1;
    while (curIdx < lines.length) {
      const curTrimmed = lines[curIdx].trim();
      if (!curTrimmed) {
        let peekIdx = curIdx + 1;
        while (peekIdx < lines.length && !lines[peekIdx].trim()) {
          peekIdx++;
        }
        if (peekIdx < lines.length && isTableRow(lines[peekIdx]) && !isTableDelimiterRow(lines[peekIdx])) {
          curIdx = peekIdx;
          continue;
        } else {
          break;
        }
      }

      if (isTableRow(curTrimmed) && !isTableDelimiterRow(curTrimmed)) {
        rows.push(parseTableCells(lines[curIdx]));
        curIdx++;
      } else {
        break;
      }
    }

    elements.push(
      <div
        key={`table-${startIndex}`}
        className="my-3 w-full overflow-x-auto rounded-lg border border-[#5D3FD3]/20 dark:border-white/10 bg-card/70 shadow-xs"
      >
        <table className="w-full border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-[#5D3FD3]/20 dark:border-white/10 bg-[#5D3FD3]/5 dark:bg-white/5 font-semibold text-foreground">
              {headerCells.map((header, hIdx) => {
                const align = alignments[hIdx] || "left";
                const alignClass =
                  align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
                return (
                  <th
                    key={`th-${startIndex}-${hIdx}`}
                    className={`px-3 py-2.5 text-xs font-semibold tracking-wider text-[#5D3FD3] dark:text-[#9D7CFF] whitespace-nowrap ${alignClass}`}
                  >
                    {renderInlineMarkdown(header, options)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {rows.map((row, rIdx) => (
              <tr
                key={`tr-${startIndex}-${rIdx}`}
                className="transition-colors hover:bg-muted/30 even:bg-muted/10"
              >
                {headerCells.map((_, cIdx) => {
                  const cellContent = row[cIdx] !== undefined ? row[cIdx] : "";
                  const align = alignments[cIdx] || "left";
                  const alignClass =
                    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
                  return (
                    <td
                      key={`td-${startIndex}-${rIdx}-${cIdx}`}
                      className={`px-3 py-2 text-xs leading-relaxed text-foreground/90 align-top ${alignClass}`}
                    >
                      {renderInlineMarkdown(cellContent, options)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    return curIdx - 1;
  }
  return startIndex; // Return original if not a valid table
}

function renderHeader(trimmed: string, isMarkdownHeader: boolean, headerMatch: RegExpMatchArray | null, index: number, options?: MarkdownOptions): React.ReactNode {
  const headingLevel = isMarkdownHeader && headerMatch ? headerMatch[1].length : 5;
  const headingText = isMarkdownHeader && headerMatch
    ? headerMatch[2]
    : trimmed.replace(/^\*\*/, "").replace(/\*\*/, "").replace(/:$/, "");

  if (headingLevel <= 2) {
    return (
      <div
        key={`heading-${index}`}
        role="heading"
        aria-level={headingLevel}
        className="text-base sm:text-lg font-bold text-[#5D3FD3] dark:text-[#9D7CFF] pt-2.5 pb-1.5 flex items-center gap-1.5 border-b border-[#5D3FD3]/25 dark:border-white/10 tracking-tight"
      >
        <span className="inline-flex items-center flex-wrap gap-1">{renderInlineMarkdown(headingText, options)}</span>
      </div>
    );
  } else if (headingLevel === 3) {
    return (
      <div
        key={`heading-${index}`}
        role="heading"
        aria-level={3}
        className="text-sm sm:text-base font-bold text-[#5D3FD3] dark:text-[#9D7CFF] pt-2 pb-1 flex items-center gap-1.5 border-b border-[#5D3FD3]/15 dark:border-white/10"
      >
        <span className="inline-flex items-center flex-wrap gap-1">{renderInlineMarkdown(headingText, options)}</span>
      </div>
    );
  } else if (headingLevel === 4) {
    return (
      <div
        key={`heading-${index}`}
        role="heading"
        aria-level={4}
        className="text-xs sm:text-sm font-semibold text-foreground/90 dark:text-gray-200 pt-2 pb-0.5 flex items-center gap-1.5"
      >
        <span className="inline-flex items-center flex-wrap gap-1">{renderInlineMarkdown(headingText, options)}</span>
      </div>
    );
  } else {
    // level >= 5 or isBoldHeader
    return (
      <div
        key={`heading-${index}`}
        role="heading"
        aria-level={5}
        className="text-xs sm:text-sm font-semibold text-[#5D3FD3] dark:text-[#9D7CFF] pt-1.5 pb-0.5 flex items-center gap-1.5"
      >
        <span className="inline-flex items-center flex-wrap gap-1">{renderInlineMarkdown(headingText, options)}</span>
      </div>
    );
  }
}

function renderListOrParagraph(rawLine: string, trimmed: string, index: number, options?: MarkdownOptions): React.ReactNode {
  // Nested / Indented sub-bullets
  const isSubBullet = /^(\t+|\s{2,})[+*•-]\s+(.*)/.test(rawLine);
  if (isSubBullet) {
    const subContent = rawLine.replace(/^(\t+|\s{2,})[+*•-]\s+/, "");
    return (
      <div key={`subbullet-${index}`} className="flex items-start gap-2 pl-5 py-0.5 text-xs text-muted-foreground">
        <span className="text-[#5D3FD3] dark:text-[#9D7CFF] mt-1 text-[8px] select-none">•</span>
        <span className="flex-1 leading-relaxed">{renderInlineMarkdown(subContent, options)}</span>
      </div>
    );
  }

  // Primary list item
  const isPrimaryBullet = /^[*•-]\s+(.*)/.test(trimmed);
  if (isPrimaryBullet) {
    const bulletContent = trimmed.replace(/^[*•-]\s+/, "");
    return (
      <div key={`bullet-${index}`} className="flex items-start gap-2 pl-1 py-1 text-xs sm:text-sm">
        <span className="text-[#5D3FD3] dark:text-[#9D7CFF] mt-1.5 text-[8px] select-none">●</span>
        <span className="flex-1 leading-relaxed">{renderInlineMarkdown(bulletContent, options)}</span>
      </div>
    );
  }

  // Standard paragraph line
  return (
    <p key={`p-${index}`} className="py-0.5 text-xs sm:text-sm leading-relaxed">
      {renderInlineMarkdown(trimmed, options)}
    </p>
  );
}

/**
 * Full block & inline markdown renderer for structured LLM qualitative responses.
 * Renders headers, tables, lists, nested sub-lists, bold, italics, and citation pills.
 */
export const renderMarkdown = (text: string | null | undefined, options?: MarkdownOptions): React.ReactNode => {
  if (!text) return null;

  // Normalize line breaks
  let normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // Normalize legacy medoid and exploratory headers and filter out standalone explanation subtitles
  normalized = normalized
    .replace(/\*\*Entry story · mathematical medoid\*\*/gi, "**Entry story (i)**")
    .replace(/\*\*(.*?\bExploratory view)\*\*/gi, "### $1 (i)");

  // Ensure any multi-hash markdown header (## to ######) directly following sentence-ending punctuation is placed on its own line
  normalized = normalizeInlineHeaders(normalized);

  const lines = normalized.split("\n").filter((line) => {
    const t = line.trim();
    if (t.includes("exploratory starting point, not an executive summary or representative voice")) {
      return false;
    }
    if (
      t.includes("machine-suggested") &&
      t.includes("not a validated theme") &&
      t.includes("centre, edge, and contrast")
    ) {
      return false;
    }
    return true;
  });

  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      elements.push(<div key={`spacer-${i}`} className="h-2" />);
      continue;
    }

    const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
    const isMarkdownHeader = Boolean(headerMatch);
    const isBoldHeader = /^\*\*(.*?)\*\*\s*(?:\{\{medoid_info\}\}|\{\{exploratory_info\}\})?:?$/.test(trimmed);

    if (isMarkdownHeader || isBoldHeader) {
      elements.push(renderHeader(trimmed, isMarkdownHeader, headerMatch, i, options));
      continue;
    }

    if (isTableRow(trimmed)) {
      const newIdx = parseAndRenderTable(lines, i, elements, options);
      if (newIdx > i) {
        i = newIdx;
        continue;
      }
    }

    elements.push(renderListOrParagraph(rawLine, trimmed, i, options));
  }

  return <div className="space-y-0.5">{elements}</div>;
};

/**
 * Safely normalizes multi-hash markdown headers (## to ######) that follow sentence-ending
 * punctuation on the same line, without corrupting phrases like 'C# code', 'Item # 3', or 'use # for comments'.
 */
export function normalizeInlineHeaders(content: string): string {
  if (!content) return "";
  return content.replace(/([.!?:)])[ \t]+(#{2,6}[ \t]+[A-Z0-9])/g, "$1\n\n$2");
}

export function stripCitationTokens(content: string): string {
  if (!content) return "";
  const citationBracket = "\\[\\s*REF-\\d+(?:\\s*(?:[,;&]|and)?\\s*REF-\\d+)*\\s*\\]";
  const beforePunctOrEnd = new RegExp(`[ \\t]*(?:${citationBracket})+[ \\t]*(?=[\\.,;!\\?\\)]|$)`, "gi");
  const standalone = new RegExp(`(?:${citationBracket})+[ \\t]*`, "gi");

  const cleaned = content
    // Strip citation tokens before punctuation or at line/string end, preserving newlines
    .replace(beforePunctOrEnd, '')
    // Strip standalone citation tokens, preserving newlines
    .replace(standalone, '')
    // Collapse multiple horizontal spaces on the same line without flattening newlines
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  // Safely place inline section headers onto a new line if a citation was stripped before them
  return normalizeInlineHeaders(cleaned);
}

export default renderMarkdown;


