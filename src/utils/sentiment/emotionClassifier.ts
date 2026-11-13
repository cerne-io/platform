/**
 * Pure emotion classifier and runtime sentiment validation utilities.
 * Independent of the React component tree and safe for use across services, hooks, and queries.
 */

export type Sentiment = "positive" | "negative" | "neutral";

/**
 * Validates at runtime whether a database or API value is a supported Sentiment.
 */
export function isValidSentiment(value: unknown): value is Sentiment {
  return value === "positive" || value === "negative" || value === "neutral";
}

/**
 * Determines emotional sentiment based on common emotion terms.
 * Returns "unknown" if the emotion cannot be determined locally.
 */
export function determineEmotionLocally(feeling: string | null | undefined): Sentiment | "unknown" {
  if (!feeling) return "unknown";

  const lowerFeeling = feeling.toLowerCase().trim();

  const positiveTerms = new Set([
    "happy", "positive", "good", "excited", "glad", "grateful",
    "joy", "joyful", "pleased", "delighted", "content", "satisfied",
    "empowered", "enthusiastic", "engaged", "optimistic", "proud",
    "hopeful", "inspired", "confident", "cheerful", "elated",
    "triumphant", "thankful", "appreciative", "relieved", "amazed",
    "wonderful", "peaceful", "loving", "fulfilled", "accomplished",
    "encouraged", "motivated", "thrilled", "passionate", "energetic",
    "balanced", "relaxed", "calm", "eager", "interested", "fascinated",
    "valued", "respected", "brave", "strong", "determined",
    "happiness", "love", "gratitude", "hope", "excitement", "pride",
    "amusement", "relief", "affection", "compassion", "admiration",
    "trust", "empathy", "kindness", "forgiveness", "friendliness",
    "confidence", "courage", "determination", "satisfaction", "inspiration",
    "serenity", "optimism", "wonder", "awe", "appreciation", "warmth",
    "peacefulness", "curiosity", "anticipation", "exhilaration", "fulfillment",
    "bliss", "belonging", "playfulness", "tenderness", "resilience", "euphoria",
    "zest", "security", "contentment", "glee", "generosity", "comfort",
    "thankfulness", "affinity", "self-assurance", "exuberance", "radiance",
    "tranquility", "self-respect", "harmony", "lovefulness", "compassionateness",
    "invigoration", "drive", "flow", "passion", "sincerity", "altruism",
    "connectedness", "acceptance", "mindfulness", "spontaneity", "reassurance",
    "symbiosis", "enthralment", "positivity", "delight", "lightheartedness",
    "mirth", "fondness", "jubilance", "refreshment", "self-worth", "vibrancy",
    "thoughtfulness", "gratification", "enchantment", "adoration", "devotion",
    "unity", "flexibility", "creativity", "reverence", "elevation", "exaltation",
    "hopefulness", "trustworthiness", "aspiration", "sense of purpose",
    // Portuguese terms
    "feliz", "alegre", "grato", "orgulhoso", "animado", "inspirado", "esperançoso",
    "satisfeito", "calmo", "tranquilo", "motivado", "confiante", "amor", "paz"
  ]);

  const negativeTerms = new Set([
    "sad", "negative", "bad", "angry", "upset", "frustrated",
    "depressed", "unhappy", "disappointed", "annoyed", "mad", "displeased",
    "anxious", "worried", "stressed", "overwhelmed",
    "fearful", "scared", "afraid", "terrified", "hopeless", "despairing",
    "disgusted", "appalled", "horrified", "hurt", "pained", "damaged",
    "resentful", "bitter", "hostile", "furious", "enraged", "outraged",
    "jealous", "envious", "ashamed", "embarrassed", "humiliated", "guilty",
    "remorseful", "regretful", "isolated", "lonely", "abandoned", "rejected",
    "insecure", "inadequate", "incompetent",
    "exhausted", "tired", "drained", "bored", "apathetic", "indifferent",
    "suspicious", "distrustful", "betrayed", "misunderstood", "neglected",
    "anger", "fear", "sadness", "disgust", "guilt", "shame", "envy",
    "jealousy", "frustration", "loneliness", "regret", "resentment",
    "hopelessness", "despair", "anxiety", "stress", "insecurity",
    "bitterness", "grief", "disappointment", "helplessness", "dread",
    // Portuguese terms
    "triste", "com raiva", "frustrado", "ansioso", "com medo", "desapontado",
    "preocupado", "estressado", "cansado", "esgotado", "desesperado", "chateado"
  ]);

  const neutralTerms = new Set([
    "neutral", "indifferent", "mixed", "normal", "okay", "fine", "average", "unspecified",
    // Portuguese terms
    "neutro", "indiferente", "misto", "normal", "regular", "ok"
  ]);

  if (positiveTerms.has(lowerFeeling)) return "positive";
  if (negativeTerms.has(lowerFeeling)) return "negative";
  if (neutralTerms.has(lowerFeeling)) return "neutral";

  return "unknown";
}
