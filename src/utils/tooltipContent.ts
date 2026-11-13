
/**
 * Central repository for tooltip instructions throughout the application
 * Keys should be descriptive of where the tooltip is used
 */
export const tooltipContent: Record<string, string> = {
  // Dashboard tooltips
  "dashboard-total-stories": "This shows the total number of stories collected in your project. More stories provide better insights and patterns.",
  "dashboard-sentiment-breakdown": "Shows the predominant emotional sentiment across all stories. This helps understand the overall emotional tone of collected stories.",
  "dashboard-average-impact": "Displays the average significance rating from slider responses. Higher values indicate stories with greater impact.",
  "dashboard-pattern-explorations": "Use a hybrid of vector math and AI to explore your collection. Neighborhoods, central anchor entries, and tensions are calculated mathematically from semantic embeddings and participant responses—not produced by an LLM.\n\nThe AI serves as a reflective thinking partner to help you question and test these emerging patterns.\n\nChat sessions are stored locally on your device: use the Copy Chat button to save any reflections before clearing your browser cache.",
  "dashboard-share-publicly": "Create public links to share your dashboard with stakeholders or others without the need to sign-in to the platform.",
  "dashboard-network-diagram": "Maps semantic relationships between entries using text embeddings. Click Create Diagram, then adjust the Similarity slider to explore groupings: increase to isolate tightly connected clusters, or decrease to see broader connections. Click any node to read an individual entry, or on any cluster label to open all entries belonging to that cluster.",
  "dashboard-slider-responses": "View the distribution of responses across different slider questions to identify patterns in how participants rated various factors.",
  "dashboard-slider-comparison": "Compare responses between two different slider questions to identify correlations and patterns in participant assessments.",
  "dashboard-contour-chart": "Visualize the density of story responses across different slider questions to identify hotspots and trends in the data.",
  "dashboard-triangle-insights": "Here you are exploring insights on triangle questions. You can filter by emotional response, participant questions, and their combination. On most graph forms you can click on each dot and see the respective story card. Check the tutorial to learn when it's the best time to read the stories.",
  "medoid-info": "The story is the mathematical medoid, ie, the story whose narrative is closest on average to all other stories in this neighbourhood — an exploratory starting point, not an executive summary or representative voice.",
  "exploratory-view-info": "This is a machine-suggested grouping, not a validated theme. The examples below are selected to show centre, edge, and contrast; they do not stand for every story in the group.",

  // Explore tooltips
  "explore-search-filter": "Filter stories by title, content, or emotional response. Use keywords to find specific themes.",
  "explore-story-card": "Click on a story card to view the full details. You can save important stories for easy reference later.",
  "explore-save-button": "Save stories that you want to reference later or that contain particularly valuable insights.",
  "explore-import-csv": "Import stories from a CSV file. The file must have specific name columns, so best is if you add one story within the app, export to CSV, and use the same structure to your data when importing.",

  // Design tooltips
  "design-story-question": "Create a compelling question that encourages participants to share meaningful experiences. The AI will generate a suggestion that you can improve by prompting and manual edit. Check the documentation to learn what makes a good eliciting question.",
  "design-slider-questions": "Slider questions help measure specific factors in participants' stories. They provide quantitative data to complement qualitative stories. You can generate a suggestion with the Generate button and then manually edit them. Check the documentation to learn what makes good slider questions.",
  "design-participant-questions": "These questions collect demographic or contextual information about participants to help segment and analyze your stories. Enter the type of information and then the options for each one of them. Make sure your selections do not prevent anonymity.",
  "design-context-phase": "The Context Phase helps you document background information about your organization and project. This creates a foundation for your story collection. You are welcome to copy and paste some of this content, but the suggestion is that the organization takes time to reflect on all questions.",
  "design-define-phase": "The Define Phase helps you establish the core focus of your project, identify key actors, and define the factors that influence behaviors around your topic. This creates clarity for the story collection process. Do not skip this reflection. It also adds info to some AI-help.",

  // Collect tooltips
  "collect-form-share": "Share this form with participants to collect stories. You can use the public link or embed it in your website.",
  "collect-story-form": "This form is what participants will see when submitting their stories. Customize it in the Design section. It is a functional form, so you can also add stories through here.",
  "collect-share-form": "Generate a shareable link to distribute your form to participants. Anyone with the link can submit stories. You can revoke and create a new link at any time.",
  "collect-generate-links": "Here you can generate and revoke links to three different collection forms. You can also schedule the period your links would be functional.",

  // Form appearance tooltip
  "form-appearance": "Here you can customize the public story collector page. Modify the background color, add your logo, and customize the header text to match your organization's branding.",

  // AI Assistant tooltip
  "ai-assistant": "Use this assistant to ask questions about Cerne and its process. Be mindful that the chat is not saved after you navigate away.",

  // Interviewer page tooltip
  "interviewer-page-info": "This is how a chat Interviewer to collect stories will be seen by participants. It is functional, so you can also add stories through here.",

  // General tooltips
  "loading-data": "Your data is being retrieved. This may take a moment depending on the size of your project.",
  "empty-state": "No data available yet. Start by adding content or collecting responses to see information here.",
  "error-state": "Something went wrong. Try refreshing the page or check your connection. If the problem persists, contact support."
};

/**
 * Get tooltip content by key
 * @param key The key for the tooltip content
 * @param fallback Optional fallback text if key isn't found
 * @returns The tooltip content or fallback text
 */
export function getTooltipContent(key: string, fallback: string = "Additional information"): string {
  return tooltipContent[key] || fallback;
}

