import { NextResponse } from 'next/server';
import OpenAI from 'openai';

import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Invalid PR URL' }, { status: 400 });
    }
    
    // Extract owner, repo, and PR number from the URL
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid GitHub PR URL format' }, { status: 400 });
    }

    const [, owner, repo, pullNumber] = match;

    // Fetch PR details
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: parseInt(pullNumber, 10)
    });

    console.log(`PR #${pr.number}: ${pr.title}`);
    console.log(`Status: ${pr.state}`);
    console.log(`Created: ${pr.created_at}, Updated: ${pr.updated_at}`);
    console.log(`Author: ${pr.user.login}`);
    console.log(`Description: ${pr.body || 'No description provided'}`);

    // Fetch PR files
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pr.number
    });

    console.log(`\nFiles changed (${files.length}):`);
    files.forEach(file => {
      console.log(`- ${file.filename} (${file.status}, +${file.additions}/-${file.deletions})`);
    });

    // Fetch PR comments
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: pr.number
    });

    console.log(`\nComments (${comments.length}):`);
    comments.forEach(comment => {
      console.log(`- ${comment.user.login} at ${comment.created_at}:`);
      console.log(`  ${comment.body.replace(/\n/g, '\n  ')}`);
    });

    // Prepare data for GPT-4
    const prData = {
      number: pr.number,
      title: pr.title,
      state: pr.state,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      author: pr.user.login,
      description: pr.body || 'No description provided',
      files: files.map(file => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions
      })),
      comments: comments.map(comment => ({
        user: comment.user.login,
        created_at: comment.created_at,
        body: comment.body
      }))
    };

    // Send data to GPT-4 for analysis
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that analyzes GitHub pull requests and does funny code related roasts. Don't be mean and personal."
        },
        {
          role: "user",
          content: `Use the Pull request data: ${JSON.stringify(prData)} and roast this Pull Request in a funny way. Don't be mean and personal, but be funny. Use all kinds of code related jokes. Ony print the roast and nothing else.
          make sure you print a ascii art of something related to the roast.`
        }
      ],
    });

    const analysis = gptResponse.choices[0].message.content;

    console.log(`\nGPT-4 Analysis:`);
    console.log(analysis)

    return NextResponse.json({ 
      message: `PR information has been printed to the console.`,
      analysis: analysis
    });
  } catch (error) {
    console.error('Error fetching PR information:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}