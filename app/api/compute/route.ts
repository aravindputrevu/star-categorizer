import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'edge';

// Initialize Octokit and Anthropic
const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Define types to handle the GitHub API response
interface StarredRepo {
  full_name: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  // Add other properties as needed
}

async function getAllStarredRepos(octokit: Octokit, username: string): Promise<StarredRepo[]> {
  try {
    // First, get the first page
    const firstPage = await octokit.rest.activity.listReposStarredByUser({
      username: username,
      per_page: 100,
      page: 1
    });

    if (firstPage.data.length === 0) {
      return [];
    }

    // Get total pages from the last page number in the Link header
    const linkHeader = firstPage.headers.link || '';
    const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
    const totalPages = lastPageMatch ? parseInt(lastPageMatch[1]) : 1;

    // If only one page, return first page results
    if (totalPages <= 1) {
      return extractRepoData(firstPage.data);
    }

    console.log(`Fetching ${totalPages} pages of starred repos...`); // Debug log

    // Create array of promises for remaining pages
    const pagePromises = Array.from({ length: totalPages - 1 }, (_, i) =>
      octokit.rest.activity.listReposStarredByUser({
        username: username,
        per_page: 100,
        page: i + 2
      })
    );

    // Fetch all pages in parallel
    const remainingPages = await Promise.all(pagePromises);
    
    // Process and combine all results
    const firstPageRepos = extractRepoData(firstPage.data);
    const remainingRepos = remainingPages.flatMap(response => extractRepoData(response.data));
    
    const allStars = [...firstPageRepos, ...remainingRepos];

    console.log(`Total stars fetched: ${allStars.length}`); // Debug log
    return allStars;
  } catch (error) {
    console.error('Error fetching starred repos:', error);
    throw error;
  }
}

// Helper function to extract repository data from API response
function extractRepoData(data: any[]): StarredRepo[] {
  return data.map(item => {
    // Handle both the old and new GitHub API response formats
    const repoData = item.repo || item;
    
    return {
      full_name: repoData.full_name,
      description: repoData.description,
      language: repoData.language,
      topics: repoData.topics || [],
      stargazers_count: repoData.stargazers_count
      // Add other properties as needed
    };
  });
}

async function categorizeRepos(repos: StarredRepo[]) {
  const repoDescriptions = repos.map(repo => ({
    name: repo.full_name,
    description: repo.description || 'No description',
    language: repo.language,
    topics: repo.topics || [],
    stars: repo.stargazers_count
  }));

  console.log("repo length is :" + repos.length);

  // Batch processing configuration
  const BATCH_SIZE = 200; // Adjust this value based on token limit testing
  const batches = [];
  
  // Split repositories into batches
  for (let i = 0; i < repoDescriptions.length; i += BATCH_SIZE) {
    batches.push(repoDescriptions.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`Processing ${batches.length} batches of repositories`);
  
  // Process each batch
  const batchResults = await Promise.all(batches.map(async (batch, index) => {
    console.log(`Processing batch ${index + 1}/${batches.length} with ${batch.length} repositories`);
    
    const prompt = `Please analyze these GitHub repositories and categorize them into meaningful groups based on their purpose and technology. Consider the following:

1. Focus on the repository's purpose and domain (e.g., Web Frameworks, Machine Learning, DevOps Tools)
2. Use the primary language, description, and topics as indicators
3. Create categories that best represent this user's interests. Categories can be unlimited.
4. For repositories that don't clearly fit a category, use "Miscellaneous" as a last resort
5. Some repositories may belong to multiple categories, but place each in the most relevant single category

Return ONLY a JSON object with category names as keys and arrays of repository full_names as values. The format should be:
{
  "Category1": ["owner/repo1", "owner/repo2"],
  "Category2": ["owner/repo3", "owner/repo4"],
  ...
}

Here are the repositories to categorize:
${JSON.stringify(batch, null, 2)}`;

    console.log(`Batch ${index + 1} prompt length: ${prompt.length}`);
    
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: prompt,
        }],
        temperature: 0.6,
      });
      
      if (Array.isArray(response.content) && response.content.length > 0) {
        console.log(`Batch ${index + 1} categorization complete`);
        
        // Handle the response content block properly based on type
        const content = response.content[0];
        if ('text' in content) {
          return JSON.parse(content.text);
        } else {
          throw new Error('Unexpected content type in Claude response');
        }
      } else {
        throw new Error('Invalid response format from Claude');
      }
    } catch (error) {
      console.error(`Error processing batch ${index + 1}:`, error);
      throw error;
    }
  }));
  
  // Merge results from all batches
  const mergedCategories: Record<string, string[]> = {};
  
  for (const batchResult of batchResults) {
    for (const [category, repos] of Object.entries(batchResult)) {
      if (!mergedCategories[category]) {
        mergedCategories[category] = [];
      }
      mergedCategories[category] = [...mergedCategories[category], ...(repos as string[])];
    }
  }
  
  console.log("Merged all batch results successfully");
  return mergedCategories;
}

async function getQuirkyDevFact(anthropic: Anthropic) {
  const prompt = `Generate one interesting, quirky, and surprising fact about programming, software development, or computer science history. 
  Make it concise (1-2 sentences), fun, and somewhat obscure - the kind of fact that would make developers say "I didn't know that!". 
  Make sure it's actually true and verifiable. Respond with ONLY the fact itself, no introduction or explanation.`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: prompt,
    }],
    temperature: 0.8,
  });
  
  if (Array.isArray(response.content) && response.content.length > 0) {
    const content = response.content[0];
    if ('text' in content) {
      return content.text.trim();
    }
  }
  
  return "The first computer bug was an actual insect - a moth found trapped in a relay of the Harvard Mark II computer in 1947, which gave rise to the term 'debugging'.";
}

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }

    const starredRepos = await getAllStarredRepos(octokit, username);
    console.log('Number of starred repositories:', starredRepos.length);
    
    if (starredRepos.length === 0) {
      // If no stars, return a quirky developer fact instead
      const quirkyFact = await getQuirkyDevFact(anthropic);
      return NextResponse.json({ 
        message: `No starred repositories found for ${username}`,
        starredCount: 0,
        noStars: true,
        devFact: quirkyFact
      });
    }

    const categorizedRepos = await categorizeRepos(starredRepos);
    console.log('Categorized repositories:', categorizedRepos);

    return NextResponse.json({ 
      message: `Successfully categorized starred projects for ${username}`,
      starredCount: starredRepos.length,
      categories: categorizedRepos
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}