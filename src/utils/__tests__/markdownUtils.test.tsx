import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderMarkdown, renderInlineMarkdown } from "../markdownUtils";

describe("markdownUtils", () => {
  it("renders inline bold, italics, and story citations", () => {
    const text = "This is **important** and *noteworthy* (Stories 1-3).";
    const result = renderInlineMarkdown(text);
    expect(result).toBeDefined();
    expect(React.isValidElement(React.createElement("div", null, result))).toBe(true);
  });

  it("renders structured markdown blocks including headings and nested lists", () => {
    const markdown = [
      "**Overarching Patterns and Strengths**",
      "",
      "* Many participants expressed feelings of **overwhelm**.",
      "* Several themes emerged, including:",
      "\t+ Adequate **training and support** (Stories 1-3).",
      "\t+ Supportive work culture (Stories 4-5).",
      "",
      "**Strengths**",
      "",
      "* Deep commitment demonstrated.",
    ].join("\n");

    const result = renderMarkdown(markdown);
    expect(result).toBeDefined();
    expect(React.isValidElement(result)).toBe(true);
  });

  it("handles null and empty strings gracefully", () => {
    expect(renderMarkdown(null)).toBeNull();
    expect(renderMarkdown("")).toBeNull();
  });

  it("does not treat snake_case identifiers as italics", () => {
    const text = "Inspect scope_more_left_weighted and scope_more_middle_weighted";
    const result = renderInlineMarkdown(text);
    expect(result).toBeDefined();
    // Test that the raw snake_case string is preserved without italicizing 'more'
    const rendered = React.createElement("div", null, result);
    expect(rendered).toBeDefined();
    // If it was split by _more_, it would create em element. With the fix, no em is created.
    const textNodes = JSON.stringify(result);
    expect(textNodes).toContain("scope_more_left_weighted");
  });

  it("renders markdown tables properly", () => {
    const tableMarkdown = [
      "| Slider Dimension | Inside broad grouping | Outside it | What this suggests to inspect |",
      "| --- | --- | --- | --- |",
      "| How valued do you feel? | 42 / 100 | 53 / 100 | Skews towards lower pole |",
      "| How flexible is scheduling? | 57 / 100 | 48 / 100 | Concentrated in middle range |",
    ].join("\n");

    const result = renderMarkdown(tableMarkdown);
    expect(React.isValidElement(result)).toBe(true);

    const html = renderToStaticMarkup(result as React.ReactElement);
    expect(html).toContain("<table");
    expect(html).toContain("<thead");
    expect(html).toContain("<tbody");
    expect(html).toContain("Slider Dimension");
    expect(html).toContain("42 / 100");
    expect(html).toContain("Skews towards lower pole");
  });

  it("tolerates blank lines within tables from LLM or template outputs", () => {
    const tableWithBlankLines = [
      "Participant Sliders (Signification)",
      "| Slider Dimension | Inside broad grouping | Outside it | What this suggests to inspect |",
      "",
      "| --- | --- | --- | --- |",
      "",
      "| How valued do you feel? | 42 / 100 | 53 / 100 | Skews lower |",
      "",
      "| How flexible is scheduling? | 57 / 100 | 48 / 100 | Balanced |",
      "",
      "Question: Does the semantic grouping bring together stories?",
    ].join("\n");

    const result = renderMarkdown(tableWithBlankLines);
    expect(React.isValidElement(result)).toBe(true);

    const html = renderToStaticMarkup(result as React.ReactElement);
    expect(html).toContain("<table");
    expect(html).toContain("Slider Dimension");
    expect(html).toContain("Skews lower");
    expect(html).toContain("Balanced");
    expect(html).toContain("Question: Does the semantic grouping bring together stories?");
  });

  it("renders Entry story (i) with an interactive tooltip", () => {
    const markdown = [
      "**Entry story (i)**",
      '*"Recognition matters"*',
      "",
      '> "Feeling valued by colleagues"',
    ].join("\n");

    const result = renderMarkdown(markdown);
    expect(React.isValidElement(result)).toBe(true);

    const html = renderToStaticMarkup(result as React.ReactElement);
    expect(html).toContain("Entry story");
    expect(html).toContain("lucide-info");
    expect(html).toContain("Recognition matters");
  });

  it("normalizes legacy medoid text into Entry story (i) with tooltip", () => {
    const legacyMarkdown = [
      "**Entry story · mathematical medoid**",
      '*"Recognition matters"*',
      "*(The story whose narrative is closest on average to all other stories in this neighbourhood — an exploratory starting point, not an executive summary or representative voice)*",
      "",
      '> "Feeling valued by colleagues"',
    ].join("\n");

    const result = renderMarkdown(legacyMarkdown);
    expect(React.isValidElement(result)).toBe(true);

    const html = renderToStaticMarkup(result as React.ReactElement);
    expect(html).toContain("Entry story");
    expect(html).toContain("lucide-info");
    expect(html).toContain("Recognition matters");
    expect(html).not.toContain("an exploratory starting point, not an executive summary or representative voice");
  });

  it("renders Exploratory view (i) with an interactive tooltip inside heading", () => {
    const markdown = "### N3 · Story neighbourhood · 6 of 56 stories · Exploratory view (i)";
    const result = renderMarkdown(markdown);
    expect(React.isValidElement(result)).toBe(true);

    const html = renderToStaticMarkup(result as React.ReactElement);
    expect(html).toContain("N3 · Story neighbourhood · 6 of 56 stories · Exploratory view");
    expect(html).toContain("lucide-info");
    expect(html).toContain('role="heading"');
    expect(html).toContain('aria-level="3"');
  });

  it("normalizes legacy exploratory view header and removes standalone explanation subtitle", () => {
    const legacyMarkdown = [
      "**N3 · Story neighbourhood · 6 of 56 stories · Exploratory view**",
      "*This is a machine-suggested grouping, not a validated theme. The examples below are selected to show centre, edge, and contrast; they do not stand for every story in the group.*",
      "",
      "**Entry story (i)**",
      '*"Recognition matters"*',
    ].join("\n");

    const result = renderMarkdown(legacyMarkdown);
    expect(React.isValidElement(result)).toBe(true);

    const html = renderToStaticMarkup(result as React.ReactElement);
    expect(html).toContain("N3 · Story neighbourhood · 6 of 56 stories · Exploratory view");
    expect(html).toContain("lucide-info");
    expect(html).not.toContain("The examples below are selected to show centre, edge, and contrast");
  });

  it("renders distinct heading hierarchy for different levels", () => {
    const markdown = [
      "## Major Heading",
      "### Section Heading",
      "#### Subsection Heading",
      "**Bold Label**",
    ].join("\n");

    const result = renderMarkdown(markdown);
    const html = renderToStaticMarkup(result as React.ReactElement);
    expect(html).toContain('aria-level="2"');
    expect(html).toContain('aria-level="3"');
    expect(html).toContain('aria-level="4"');
    expect(html).toContain('aria-level="5"');
  });

  it("respects markdown hash headers even when preceded by text without a blank line", () => {
    const raw = 'The participant places a point inside the triangle to show how much of each quality was present in that experience. ## Key difference\nWith a slider, you are capturing how a story falls along a single contrast.';
    const result = renderMarkdown(raw);
    const html = renderToStaticMarkup(result as React.ReactElement);
    expect(html).toContain('aria-level="2"');
    expect(html).toContain('Key difference');
    // Ensure the literal ## hash is parsed and not leaked into the body text
    expect(html).not.toContain('## Key difference');
  });

  it("normalizes CRLF line breaks and renders headers properly", () => {
    const raw = "Paragraph one.\r\n\r\n## Section Two\r\n\r\nParagraph two.";
    const result = renderMarkdown(raw);
    const html = renderToStaticMarkup(result as React.ReactElement);
    expect(html).toContain('aria-level="2"');
    expect(html).toContain('Section Two');
  });

  it("does not convert phrases with # like 'C# code', 'Item # 3', or 'use # for comments' into headers", () => {
    const raw = "Working with C# code and Item # 3, remember to use # for comments and check Issue # 42.";
    const result = renderMarkdown(raw);
    const html = renderToStaticMarkup(result as React.ReactElement);
    expect(html).not.toContain('role="heading"');
    expect(html).toContain("Working with C# code and Item # 3, remember to use # for comments and check Issue # 42.");
  });
});

