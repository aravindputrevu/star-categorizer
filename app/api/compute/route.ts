import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { getDefaultLLMProvider, LLMMessage, createLLMClient, LLMProvider } from '@/lib/llm';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'edge';
export const maxDuration = 60; // Extend function timeout to 60 seconds

// Initialize Octokit with performance optimizations
const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN,
  request: {
    timeout: 10000 // 10 second timeout for API requests
  }
});

// Get default LLM provider based on environment variables
let llmClient: LLMProvider;

// Defer initialization to execution time to avoid circular dependency issues
function getLLMClient(): LLMProvider {
  if (!llmClient) {
    llmClient = getDefaultLLMProvider();
  }
  return llmClient;
}

// Define types to handle the GitHub API response
interface StarredRepo {
  full_name: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
}

// Simple in-memory cache with expiration
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class SimpleCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly TTL: number; // Time to live in milliseconds
  
  constructor(ttlMinutes: number = 60) {
    this.TTL = ttlMinutes * 60 * 1000;
  }
  
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.TTL
    });
  }
}

// Initialize caches
const starsCache = new SimpleCache<StarredRepo[]>(30); // 30 minute cache for starred repos
const categoriesCache = new SimpleCache<Record<string, string[]>>(30); // 30 minute cache for categories

async function getAllStarredRepos(octokit: Octokit, username: string): Promise<StarredRepo[]> {
  try {
    // Check cache first
    const cacheKey = `stars-${username}`;
    const cachedRepos = starsCache.get(cacheKey);
    if (cachedRepos) {
      console.log(`Using cached starred repos for ${username}`);
      return cachedRepos;
    }

    console.log(`Fetching starred repos for ${username}`);
    
    // Optimize concurrency with a concurrency limiter
    const PER_PAGE = 100; // Maximum allowed by GitHub API
    const CONCURRENCY_LIMIT = 3; // Limits number of simultaneous requests
    
    // First, get the first page
    const firstPage = await octokit.rest.activity.listReposStarredByUser({
      username: username,
      per_page: PER_PAGE,
      page: 1
    });

    if (firstPage.data.length === 0) {
      return [];
    }

    // Get total pages from the last page number in the Link header
    const linkHeader = firstPage.headers.link || '';
    const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
    const totalPages = lastPageMatch ? parseInt(lastPageMatch[1]) : 1;

    // If only one page, process and cache results
    if (totalPages <= 1) {
      const repos = extractRepoData(firstPage.data);
      starsCache.set(cacheKey, repos);
      return repos;
    }

    console.log(`Fetching ${totalPages} pages of starred repos...`);

    // Process first page data to get a head start
    const firstPageRepos = extractRepoData(firstPage.data);
    
    // Create batches of requests to limit concurrency
    const batchCount = Math.ceil((totalPages - 1) / CONCURRENCY_LIMIT);
    let allRemainingRepos: StarredRepo[] = [];

    // Process pages in batches to control concurrency
    for (let batch = 0; batch < batchCount; batch++) {
      const startPage = batch * CONCURRENCY_LIMIT + 2; // +2 because first page is already fetched
      const endPage = Math.min(startPage + CONCURRENCY_LIMIT - 1, totalPages);
      
      console.log(`Fetching pages ${startPage} to ${endPage} (batch ${batch + 1}/${batchCount})`);
      
      // Create promises for this batch
      const pagePromises = Array.from(
        { length: endPage - startPage + 1 }, 
        (_, i) => octokit.rest.activity.listReposStarredByUser({
          username: username,
          per_page: PER_PAGE,
          page: startPage + i
        })
      );

      // Fetch this batch in parallel
      const batchPages = await Promise.all(pagePromises);
      
      // Process and add to results
      const batchRepos = batchPages.flatMap(response => extractRepoData(response.data));
      allRemainingRepos = [...allRemainingRepos, ...batchRepos];
    }
    
    // Combine all results
    const allStars = [...firstPageRepos, ...allRemainingRepos];

    console.log(`Total stars fetched: ${allStars.length}`);
    
    // Cache the results
    starsCache.set(cacheKey, allStars);
    
    return allStars;
  } catch (error) {
    console.error('Error fetching starred repos:', error);
    throw error;
  }
}

// Helper function to extract repository data from API response - optimized version
function extractRepoData(data: any[]): StarredRepo[] {
  // Pre-allocate array size for better performance
  const result = new Array(data.length);
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    // Handle both the old and new GitHub API response formats
    const repoData = item.repo || item;
    
    // Extract only the fields we need for categorization
    result[i] = {
      full_name: repoData.full_name,
      description: repoData.description,
      language: repoData.language,
      topics: repoData.topics || [],
      stargazers_count: repoData.stargazers_count
    };
  }
  
  return result;
}

async function categorizeRepos(repos: StarredRepo[], username: string) {
  // Check cache first
  const cacheKey = `categories-${username}-${repos.length}`;
  const cachedCategories = categoriesCache.get(cacheKey);
  if (cachedCategories) {
    console.log(`Using cached categories for ${username}`);
    return cachedCategories;
  }

  console.log(`Creating optimized repo descriptions for ${repos.length} repositories`);
  
  // Create optimized description objects to minimize JSON size
  const repoDescriptions = new Array(repos.length);
  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    repoDescriptions[i] = {
      name: repo.full_name,
      // Only include non-null/undefined values to reduce JSON size
      ...(repo.description ? { description: repo.description } : { description: 'No description' }),
      ...(repo.language ? { language: repo.language } : {}),
      ...(repo.topics && repo.topics.length > 0 ? { topics: repo.topics } : {}),
      ...(repo.stargazers_count > 0 ? { stars: repo.stargazers_count } : {})
    };
  }

  // Optimize batch size based on repository complexity
  // This is a heuristic approach - larger batches for simpler repos, smaller for complex ones
  const avgDescriptionLength = JSON.stringify(repoDescriptions).length / repos.length;
  // Adjust batch size dynamically based on average complexity
  const BATCH_SIZE = avgDescriptionLength < 200 ? 250 : 
                     avgDescriptionLength < 500 ? 150 : 100;
  
  console.log(`Using dynamic batch size of ${BATCH_SIZE} (avg desc length: ${avgDescriptionLength.toFixed(1)})`);
  
  // Create batches more efficiently
  const batchCount = Math.ceil(repoDescriptions.length / BATCH_SIZE);
  const batches = new Array(batchCount);
  
  for (let i = 0; i < batchCount; i++) {
    const start = i * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, repoDescriptions.length);
    batches[i] = repoDescriptions.slice(start, end);
  }
  
  console.log(`Processing ${batches.length} batches of repositories`);
  
  // Process batches in parallel with an optimized compact prompt
  const batchResults = await Promise.all(batches.map(async (batch, index) => {
    console.log(`Processing batch ${index + 1}/${batches.length} with ${batch.length} repositories`);
    
    // Create a more compact prompt
    const prompt = `Categorize these GitHub repos into groups by purpose and technology:
1. Focus on purpose (Web Frameworks, ML, DevOps, etc.)
2. Use language, description, and topics
3. Use "Miscellaneous" only when needed
4. Place each repo in most relevant category
5. Do not include duplicate repositories

Return JSON: {"Category1": ["owner/repo1", "owner/repo2"], "Category2": ["owner/repo3", "owner/repo4"], ...}

Repositories:
${JSON.stringify(batch)}

Note: Only return valid JSON. No markdown, no text before or after the JSON object.`;

    console.log(`Batch ${index + 1} prompt length: ${prompt.length}`);
    
    // Helper function to clean and parse JSON response
    const parseResponse = (text: string) => {
      try {
        // Clean the response text
        const cleanedResponse = text
          .replace(/```json\s*|\s*```/g, '')  // Remove JSON code blocks
          .trim();
        
        // Parse JSON
        const parsed = JSON.parse(cleanedResponse);
        
        // Remove duplicates from each category
        const deduped: Record<string, string[]> = {};
        const seen = new Set<string>();
        
        for (const [category, repos] of Object.entries(parsed)) {
          if (Array.isArray(repos)) {
            deduped[category] = repos.filter((repo: string) => {
              if (seen.has(repo)) return false;
              seen.add(repo);
              return true;
            });
          }
        }
        
        return deduped;
      } catch (error) {
        console.error('Error parsing response:', {
          error,
          stack: (error as Error).stack,
          responseText: text
        });
        throw error;
      }
    };
    
    try {
      // Use the modular LLM interface with configured provider
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: prompt,
        }
      ];

      // Configure the model with JSON schema if using Gemini
      if (process.env.DEFAULT_LLM_PROVIDER === 'gemini') {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY is required');
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: process.env.GEMINI_MODEL || "gemini-1.5-pro",
          generationConfig: {
            temperature: 0.7,
          },
        });

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        
        return parseResponse(result.response.text());
      } else {
        // Use the selected LLM provider to categorize repos
        const response = await getLLMClient().chat(messages);
        console.log(`Batch ${index + 1} categorization complete`);
        return parseResponse(response.text);
      }
    } catch (error) {
      console.error(`Error processing batch ${index + 1}:`, error);
      
      // Retry logic with a more powerful model
      console.log(`Retrying batch ${index + 1} with more capable model...`);
      try {
        // Create a more powerful client for this specific task
        if (process.env.FALLBACK_LLM_PROVIDER === 'gemini') {
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) throw new Error('GEMINI_API_KEY is required');
          
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({
            model: process.env.FALLBACK_GEMINI_MODEL || "gemini-1.5-pro",
            generationConfig: {
              temperature: 0.6,
            },
          });

          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
          });
          return parseResponse(result.response.text());
        } else {
          const powerfulClient = createLLMClient({
            provider: process.env.FALLBACK_LLM_PROVIDER || process.env.DEFAULT_LLM_PROVIDER || 'anthropic',
            model: process.env.FALLBACK_LLM_MODEL || 'claude-3-sonnet-20240229',
            temperature: 0.6,
            maxTokens: 4096
          });
          
          const retryResponse = await powerfulClient.chat([
            {
              role: 'user',
              content: prompt,
            }
          ]);
          
          const cleanedResponse = retryResponse.text
            .replace(/```json\s*|\s*```/g, '')
            .trim();
          
          return parseResponse(cleanedResponse);
        }
      } catch (retryError) {
        console.error(`Retry also failed for batch ${index + 1}:`, {
          error: retryError,
          stack: (retryError as Error).stack,
          message: (retryError as Error).message
        });
        return {};
      }
    }
  }));
  
  // Merge results from all batches using a more efficient approach
  const mergedCategories: Record<string, string[]> = {};
  
  for (const batchResult of batchResults) {
    for (const [category, repos] of Object.entries(batchResult)) {
      if (!mergedCategories[category]) {
        mergedCategories[category] = [...(repos as string[])];
      } else {
        mergedCategories[category].push(...(repos as string[]));
      }
    }
  }
  
  console.log("Merged all batch results successfully");
  
  // Cache the results
  categoriesCache.set(cacheKey, mergedCategories);
  
  return mergedCategories;
}

// Cache for quirky dev facts
const factCache = new SimpleCache<string[]>(1440); // 24 hour cache
const FACT_CACHE_KEY = 'dev-facts';

async function getQuirkyDevFact() {
  // Try to get a random fact from cache first
  const cachedFacts = factCache.get(FACT_CACHE_KEY);
  if (cachedFacts && cachedFacts.length > 0) {
    // Return a random fact from the cache
    return cachedFacts[Math.floor(Math.random() * cachedFacts.length)];
  }
  
  // Optimized prompt
  const prompt = `Share an interesting, quirky programming/computer science fact (1-2 sentences). Make it obscure but true.`;

  try {
    // Use fast model configuration for quick fact generation
    const factClient = createLLMClient({
      provider: process.env.DEFAULT_LLM_PROVIDER || 'anthropic',
      temperature: 0.7,
      maxTokens: 256, // Reduce token limit for faster response
    });
    
    const response = await factClient.chat([
      {
        role: 'user',
        content: prompt,
      }
    ]);
    
    const fact = response.text.trim();
    
    // Add to cache for future requests
    const facts = factCache.get(FACT_CACHE_KEY) || [];
    facts.push(fact);
    factCache.set(FACT_CACHE_KEY, facts);
    
    return fact;
  } catch (error) {
    console.error('Error getting quirky dev fact:', error);
  }
  
  // Fallback facts in case of API failure
  const fallbackFacts = [
    "The first computer bug was an actual insect - a moth found trapped in a relay of the Harvard Mark II computer in 1947, which gave rise to the term 'debugging'.",
    "The programming language Python wasn't named after the snake, but after the British comedy group Monty Python.",
    "The first programmer in history was Ada Lovelace, who wrote an algorithm for Charles Babbage's Analytical Engine in the 1840s.",
    "The world's first computer programmer, Ada Lovelace, was Lord Byron's daughter.",
    "The HTTP 418 error code stands for 'I'm a teapot' and was an April Fools' joke from 1998."
  ];
  
  return fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)];
}

// Track current requests to prevent duplicate processing
const pendingRequests = new Map<string, Promise<any>>();

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    // Parse request body
    const { username } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }
    
    // Check if there's already a request in progress for this username
    const requestKey = `request-${username}`;
    if (pendingRequests.has(requestKey)) {
      console.log(`Request for ${username} already in progress, reusing result`);
      try {
        const result = await pendingRequests.get(requestKey);
        return NextResponse.json(result);
      } catch (error) {
        // If the shared request failed, we'll try again below
        console.error(`Shared request for ${username} failed, retrying`);
        pendingRequests.delete(requestKey);
      }
    }
    
    // Create a new promise for this request
    const resultPromise = (async () => {
      // Fetch starred repositories
      const starredRepos = await getAllStarredRepos(octokit, username);
      console.log('Number of starred repositories:', starredRepos.length);
      
      if (starredRepos.length === 0) {
        // If no stars, return a quirky developer fact instead
        const quirkyFact = await getQuirkyDevFact();
        return { 
          message: `No starred repositories found for ${username}`,
          starredCount: 0,
          noStars: true,
          devFact: quirkyFact,
          processingTime: `${(Date.now() - startTime)/1000}s`
        };
      }

      // Categorize repositories
      const categorizedRepos = await categorizeRepos(starredRepos, username);
      
      // Log category statistics for debugging performance
      const categoryCount = Object.keys(categorizedRepos).length;
      const totalReposMapped = Object.values(categorizedRepos)
        .reduce((sum, repos) => sum + repos.length, 0);
        
      console.log(`Created ${categoryCount} categories with ${totalReposMapped} mapped repositories`);

      // Format response with timing information
      // Ensure we have valid categories data
      const validCategories = Object.keys(categorizedRepos).length > 0 
        ? categorizedRepos 
        : { "Uncategorized": starredRepos.map(repo => repo.full_name) };
      
      const finalCategoryCount = Object.keys(validCategories).length;
      
      return {
        message: `Successfully categorized starred projects for ${username}`,
        starredCount: starredRepos.length,
        categoryCount: finalCategoryCount,
        categories: validCategories,
        processingTime: `${(Date.now() - startTime)/1000}s`
      };
    })();
    
    // Store the promise so concurrent requests can use it
    pendingRequests.set(requestKey, resultPromise);
    
    // Set a timeout to clear the promise from the map
    setTimeout(() => {
      pendingRequests.delete(requestKey);
    }, 60000); // Clear after 1 minute
    
    // Wait for the result
    const result = await resultPromise;
    
    // Return the JSON response
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing request:', error);
    
    // Provide more helpful error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorResponse = {
      error: 'Processing Error',
      message: errorMessage,
      suggestion: 'Please try again with fewer stars or a different username'
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}