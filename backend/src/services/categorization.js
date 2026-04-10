const axios = require("axios");
const logger = require("../utils/logger");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

/**
 * AI-powered expense categorization using GROQ LLM
 * Understands merchant names and descriptions to auto-categorize
 */

// Category keywords mapping for semantic matching
const CATEGORY_KEYWORDS = {
  Dining: [
    "swiggy",
    "zomato",
    "uber eats",
    "dominos",
    "pizza",
    "restaurant",
    "cafe",
    "coffee",
    "diner",
    "bistro",
    "eatery",
    "food delivery",
    "mcdonalds",
    "kfc",
  ],
  Groceries: [
    "grocery",
    "supermarket",
    "blinkit",
    "instamart",
    "zepto",
    "bigbasket",
    "dmart",
    "reliance fresh",
    "vegetables",
    "fruits",
    "milk",
    "bread",
    "rice",
    "dal",
  ],
  Shopping: [
    "amazon",
    "flipkart",
    "myntra",
    "ajio",
    "mall",
    "store",
    "retail",
    "clothing",
    "fashion",
    "apparel",
    "shoes",
    "shirt",
    "dress",
    "department store",
  ],
  Transport: [
    "uber",
    "ola",
    "auto",
    "taxi",
    "cab",
    "bus",
    "train",
    "flight",
    "railway",
    "petrol",
    "fuel",
    "gas station",
    "parking",
    "metro",
  ],
  Entertainment: [
    "netflix",
    "prime video",
    "spotify",
    "youtube",
    "movie",
    "cinema",
    "theater",
    "gaming",
    "games",
    "concert",
    "ticket",
    "show",
    "event",
    "spotify premium",
  ],
  Utilities: [
    "electricity",
    "water",
    "gas",
    "internet",
    "phone bill",
    "mobile recharge",
    "airtel",
    "jio",
    "vodafone",
    "utility",
    "broadband",
    "wifi",
  ],
  Healthcare: [
    "hospital",
    "doctor",
    "pharmacy",
    "medicine",
    "medical",
    "health",
    "clinic",
    "dental",
    "ayurveda",
    "ayush",
    "chemist",
    "drugstore",
  ],
  Education: [
    "school",
    "college",
    "university",
    "course",
    "tuition",
    "tutoring",
    "coaching",
    "books",
    "exam",
    "udemy",
    "coursera",
    "byjus",
    "learning",
  ],
  Fitness: [
    "gym",
    "yoga",
    "fitness",
    "trainer",
    "sports",
    "cricket",
    "badminton",
    "swimming",
    "boxing",
    "crossfit",
  ],
  Insurance: [
    "insurance",
    "policy",
    "premium",
    "health insurance",
    "car insurance",
    "bike insurance",
    "home insurance",
  ],
};

/**
 * Categorize expense using AI + semantic matching
 * Falls back to keyword matching if AI fails
 */
async function categorizeExpense(description, merchant, availableCategories) {
  if (!description && !merchant) return null;

  try {
    // First try: Fast keyword-based matching
    const keywordMatch = matchWithKeywords(description, merchant);
    if (keywordMatch) {
      const categoryId = findCategoryIdByName(
        keywordMatch,
        availableCategories,
      );
      if (categoryId) {
        logger.info(
          `Expense categorized (keyword): "${description}" → ${keywordMatch}`,
        );
        return categoryId;
      }
    }

    // Second try: AI semantic understanding (if keywords didn't match)
    if (!GROQ_API_KEY) {
      logger.warn("GROQ_API_KEY not configured, using keyword matching only");
      return null;
    }

    const categoryNames = availableCategories
      .map((c) => c.name)
      .filter((name) => name !== "Uncategorised")
      .join(", ");

    const aiCategory = await askGroqForCategory(
      description,
      merchant,
      categoryNames,
    );

    if (aiCategory) {
      const categoryId = findCategoryIdByName(aiCategory, availableCategories);
      if (categoryId) {
        logger.info(
          `Expense categorized (AI): "${description}" → ${aiCategory}`,
        );
        return categoryId;
      }
    }

    return null;
  } catch (err) {
    logger.error("Categorization error:", err.message);
    return null;
  }
}

/**
 * Fast keyword-based matching
 */
function matchWithKeywords(description, merchant) {
  const text = `${description} ${merchant}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category;
      }
    }
  }

  return null;
}

/**
 * Use GROQ LLM for semantic understanding
 */
async function askGroqForCategory(description, merchant, categoryList) {
  try {
    const prompt = `You are an expert at categorizing financial expenses. 

User made an expense:
- Description: "${description}"
- Merchant/Source: "${merchant}"

Available categories: ${categoryList}

Based on the description and merchant, determine which single category this expense belongs to. 
IMPORTANT: Reply with ONLY the category name from the list above. Do not add any explanation or extra text.

Example: If expense is "Ordered from Swiggy", reply with: Dining`;

    const response = await axios.post(
      `${GROQ_BASE_URL}/chat/completions`,
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a financial expense categorization assistant. You must reply with ONLY the category name, nothing else.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, // Low temperature for consistent categorization
        max_tokens: 20, // We only need the category name
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const categoryName = response.data.choices?.[0]?.message?.content?.trim();
    return categoryName || null;
  } catch (err) {
    logger.error("GROQ API error:", err.message);
    return null;
  }
}

/**
 * Find category ID by name
 */
function findCategoryIdByName(categoryName, availableCategories) {
  if (!categoryName) return null;

  const category = availableCategories.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
  );

  return category ? category.id : null;
}

/**
 * Get category suggestions for UI
 */
async function getSuggestedCategories(
  description,
  merchant,
  availableCategories,
) {
  try {
    // Get primary suggestion
    const primaryId = await categorizeExpense(
      description,
      merchant,
      availableCategories,
    );

    if (!primaryId) {
      // If no suggestion, return top 3 most common categories
      return availableCategories
        .filter((c) => c.name !== "Uncategorised")
        .slice(0, 3)
        .map((c) => ({ id: c.id, name: c.name, confidence: 0.3 }));
    }

    const primary = availableCategories.find((c) => c.id === primaryId);
    return primary
      ? [{ id: primary.id, name: primary.name, confidence: 0.95 }]
      : [];
  } catch (err) {
    logger.error("Get suggestions error:", err.message);
    return [];
  }
}

module.exports = {
  categorizeExpense,
  getSuggestedCategories,
  matchWithKeywords,
};
