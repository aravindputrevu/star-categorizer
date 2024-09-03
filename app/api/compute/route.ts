import { NextResponse } from 'next/server';

import { Octokit } from '@octokit/rest';

// Initialize Octokit
const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN
})

export async function POST(request: Request) {
  try {
    const { username } = await request.json()

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 })
    }

    // Fetch starred repositories for the user
    const { data: starredRepos } = await octokit.rest.activity.listReposStarredByUser({
      username: username,
      per_page: 25 // Adjust this number to fetch more or fewer repos
    })

    console.log(`Starred projects for user ${username}:`)
    for (const [index, repo] of starredRepos.entries()) {
      console.log(`${index + 1}. ${repo.full_name} (${repo.stargazers_count} stars)`)
      console.log(`   Description: ${repo.description || 'No description'}`)
      console.log(`   URL: ${repo.html_url}`)

      // Fetch additional metrics
      const [commits, issues, pullRequests, releases] = await Promise.all([
        octokit.rest.repos.listCommits({ owner: repo.owner.login, repo: repo.name, per_page: 1 }),
        octokit.rest.issues.listForRepo({ owner: repo.owner.login, repo: repo.name, state: 'open', sort: 'created', direction: 'desc', per_page: 1 }),
        octokit.rest.pulls.list({ owner: repo.owner.login, repo: repo.name, state: 'open', sort: 'created', direction: 'desc', per_page: 1 }),
        octokit.rest.repos.listReleases({ owner: repo.owner.login, repo: repo.name, per_page: 1 })
      ])

      console.log(`   Last commit: ${commits.data[0]?.commit.author?.date || 'N/A'}`)
      console.log(`   Last issue created: ${issues.data[0]?.created_at || 'N/A'}`)
      console.log(`   Last PR created: ${pullRequests.data[0]?.created_at || 'N/A'}`)
      console.log(`   Last release: ${releases.data[0]?.created_at || 'N/A'}`)
      console.log('---')
    }

    return NextResponse.json({ 
      message: `Starred projects for ${username} have been printed to the console.`,
      starredCount: starredRepos.length
    })
  } catch (error) {
    console.error('Error fetching starred projects:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}