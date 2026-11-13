interface WordData {
    text: string;
    value: number;
    className: string;
    style: React.CSSProperties;
}

const STOPWORDS = new Set([
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "as", "at",
    "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "did", "do",
    "does", "doing", "don", "down", "during", "each", "few", "for", "from", "further", "had", "has", "have",
    "having", "he", "her", "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in", "into",
    "is", "it", "its", "itself", "just", "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of",
    "off", "on", "once", "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "s", "same",
    "she", "should", "so", "some", "such", "t", "than", "that", "the", "their", "theirs", "them", "themselves",
    "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until", "up", "very",
    "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "will", "with",
    "you", "your", "yours", "yourself", "yourselves", "also", "like"
]);

const MIN_WORD_LENGTH = 3;
const MAX_WORDS = 25;

const COLOR_CLASSES = [
    "text-slate-900 dark:text-slate-100", // Darkest/Brightest (Most frequent)
    "text-slate-800 dark:text-slate-200",
    "text-slate-700 dark:text-slate-300",
    "text-slate-600 dark:text-slate-400",
    "text-slate-500 dark:text-slate-500",
    "text-slate-400 dark:text-slate-600",
    "text-slate-400 dark:text-slate-700", // Lightest/Darkest (Least frequent)
];

// Simple hash function to generate a stable number from a string
const getStableRotation = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Map hash to a range, e.g., -2 to 2 degrees
    return (Math.abs(hash) % 40) / 10 - 2;
};

// Regex to split on whitespace and punctuation (including hyphens)
// eslint-disable-next-line no-useless-escape
const SPLIT_REGEX = /[\s.,\/#!$%^&*;:{}=\-_`~()]+/;

// Threshold: if a word is capitalised in >= 70% of its occurrences it's
// treated as a proper noun (name, place) and excluded from the cloud.
const PROPER_NOUN_THRESHOLD = 0.7;

export const calculateWordCloudData = (stories: { text: string }[]): WordData[] => {
    if (!stories || stories.length === 0) return [];

    const wordCounts = new Map<string, number>();
    // Track how many times each lowercased word appeared with an initial capital
    const capitalizedCounts = new Map<string, number>();

    for (let s = 0; s < stories.length; s++) {
        const storyText = stories[s].text;
        if (!storyText) continue;

        const tokens = storyText.split(SPLIT_REGEX);
        const len = tokens.length;

        for (let i = 0; i < len; i++) {
            const w = tokens[i];
            if (w.length < MIN_WORD_LENGTH) continue;

            // Drop emails (anything containing @)
            if (w.includes('@')) continue;

            const isCapitalized = w.charCodeAt(0) >= 65 && w.charCodeAt(0) <= 90;
            const lowerWord = w.toLowerCase();

            if (STOPWORDS.has(lowerWord)) continue;

            wordCounts.set(lowerWord, (wordCounts.get(lowerWord) || 0) + 1);
            if (isCapitalized) {
                capitalizedCounts.set(lowerWord, (capitalizedCounts.get(lowerWord) || 0) + 1);
            }
        }
    }

    // Remove likely proper nouns (names, places): words capitalised >= threshold
    for (const [word, total] of wordCounts) {
        const capCount = capitalizedCounts.get(word) || 0;
        if (capCount / total >= PROPER_NOUN_THRESHOLD) {
            wordCounts.delete(word);
        }
    }

    const sortedWords = Array.from(wordCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_WORDS);

    if (sortedWords.length === 0) return [];

    const max = sortedWords[0][1];
    const min = sortedWords[sortedWords.length - 1][1];
    const range = max - min || 1;

    return sortedWords.map(([word, count]) => {
        const normalized = ((count - min) / range) * 4 + 1;
        const fontSize = Math.max(Math.round(normalized * 4) + 8, 12);
        const opacity = 0.75 + (normalized / 5) * 0.25;

        const percent = (count - min) / range;
        const colorIndex = Math.min(
            Math.floor((1 - percent) * (COLOR_CLASSES.length - 1)),
            COLOR_CLASSES.length - 1
        );

        return {
            text: word,
            value: count,
            className: COLOR_CLASSES[colorIndex],
            style: {
                fontSize: `${fontSize}px`,
                opacity,
                fontWeight: fontSize > 20 ? "bold" : "normal",
                // Stable rotation based on the word itself
                transform: `rotate(${getStableRotation(word)}deg)`
            } as React.CSSProperties
        };
    });
};
