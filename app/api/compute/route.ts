import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Octokit and Anthropic
const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function getAllStarredRepos(octokit: Octokit, username: string) {
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
      return firstPage.data;
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
    
    // Combine all results
    const allStars = [
      ...firstPage.data,
      ...remainingPages.flatMap(response => response.data)
    ];

    console.log(`Total stars fetched: ${allStars.length}`); // Debug log
    return allStars;
  } catch (error) {
    console.error('Error fetching starred repos:', error);
    throw error;
  }
}

async function categorizeRepos(repos: any[]) {
  const repoDescriptions = repos.map(repo => ({
    name: repo.full_name,
    description: repo.description || 'No description',
    language: repo.language,
    topics: repo.topics,
    stars: repo.stargazers_count
  }));

  const prompt = `Please analyze these GitHub repositories and categorize them into meaningful groups. For each repository, consider its name, description, primary language, topics, and stars. Return the results as a JSON object with categories as keys and arrays of repository names as values. Be CRISP. Don't repeat "I'll analyze these..". I'm just looking at the list of categorized repositories in JSON mode. Here are the repositories:
  ${JSON.stringify(repoDescriptions, null, 2)}`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: prompt,
    }],
    temperature: 0.6,
  });

  try {
    if (Array.isArray(response.content) && response.content.length > 0) {
      console.log("response is :"+ response.content[0].text)
      console.log("response ended***********************")
      const categorizedData = JSON.parse(response.content[0].text);
      return NextResponse.json({ categories: categorizedData });
    } else {
      throw new Error('Invalid response format from Claude');
    }
  } catch (error) {
    console.error('Error parsing Claude response:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }

    const starredRepos = await getAllStarredRepos(octokit, username);
    console.log('Number of starred repositories:', starredRepos.length);

    const categorizedRepos = await categorizeRepos(starredRepos);
    console.log('Categorized repositories:', categorizedRepos);

    return NextResponse.json({ 
      message: `Successfully categorized starred projects for ${username}`,
      starredCount: starredRepos.length
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}