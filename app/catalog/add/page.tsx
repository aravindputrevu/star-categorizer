'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AddDeveloperPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const validateUsername = (value: string) => {
    const regex = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i
    return regex.test(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!validateUsername(username)) {
      setError('Invalid GitHub username')
      return
    }

    setIsLoading(true)

    try {
      // Step 1: Process the user's stars using the compute API
      const computeResponse = await fetch('/api/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })

      if (!computeResponse.ok) {
        const errorData = await computeResponse.json()
        throw new Error(errorData.message || 'Failed to process stars')
      }

      const starData = await computeResponse.json()
      
      if (starData.noStars) {
        throw new Error('This GitHub user doesn\'t have any starred repositories')
      }

      // Step 2: Fetch GitHub profile info
      const profileResponse = await fetch(`https://api.github.com/users/${username}`)
      
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch GitHub profile information')
      }
      
      const profileData = await profileResponse.json()

      // Step 3: Create the developer catalog entry
      const developerEntry = {
        username: profileData.login,
        displayName: profileData.name || profileData.login,
        avatarUrl: profileData.avatar_url,
        bio: profileData.bio || '',
        followers: profileData.followers,
        website: profileData.blog || '',
        company: profileData.company || '',
        location: profileData.location || '',
        starCategories: starData.categories,
        topStars: Object.entries(starData.categories)
          .flatMap(([category, repos]: [string, any]) => {
            return repos.slice(0, 1).map((repo: string) => ({
              name: repo,
              description: 'Repository from ' + category,
              stars: 0, // We would normally fetch this
              category
            }))
          })
          .slice(0, 5),
        insightSummary: `${profileData.name || profileData.login}'s starred repositories show interests across ${Object.keys(starData.categories).length} different categories, with a focus on ${Object.keys(starData.categories).slice(0, 3).join(', ')}.`
      }

      // Step 4: Add to catalog via API
      const catalogResponse = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(developerEntry),
      })

      if (!catalogResponse.ok) {
        throw new Error('Failed to add developer to catalog')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/catalog')
      }, 2000)
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-4 space-y-8">
      <header className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Add Developer to Catalog</h1>
            <p className="text-gray-500">Add a GitHub user to the developer catalog</p>
          </div>
          <Link href="/catalog">
            <Button variant="outline">
              Back to Catalog
            </Button>
          </Link>
        </div>
      </header>

      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Add GitHub Developer</CardTitle>
          <p className="text-center text-gray-500 text-sm">
            Enter a GitHub username to add them to the catalog
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Enter GitHub Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full"
                disabled={isLoading || success}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && (
              <p className="text-green-500 text-sm">
                Developer added successfully! Redirecting to catalog...
              </p>
            )}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || success}
            >
              {isLoading ? 'Processing...' : 'Add to Catalog'}
            </Button>
            <p className="text-xs text-gray-400 text-center">
              {isLoading ? 'This may take a moment as we analyze the repositories...' : ''}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}