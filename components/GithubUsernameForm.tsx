'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function GithubUsernameForm() {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState(null)
  const [devFact, setDevFact] = useState('')
  const [noStars, setNoStars] = useState(false)

  const validateUsername = (value: string) => {
    const regex = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i
    return regex.test(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCategories(null)
    setDevFact('')
    setNoStars(false)

    if (!validateUsername(username)) {
      setError('Invalid GitHub username')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/compute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      })

      if (!response.ok) {
        throw new Error('Failed to compute')
      }

      const data = await response.json()
      if (data.noStars) {
        setNoStars(true)
        setDevFact(data.devFact || 'Did you know? The average programmer spends 30-50% of their time debugging code.')
      } else if (data.categories) {
        setCategories(data.categories)
      } else {
        setError('No repository data available')
      }
    } catch (error) {
      setError('An error occurred while processing the request')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-4 space-y-8">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Star Categorizer</CardTitle>
          <p className="text-center text-gray-500 text-sm">Organize your GitHub starred repositories into meaningful categories</p>
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
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Analyzing Stars...' : 'Categorize Stars'}
            </Button>
            <p className="text-xs text-gray-400 text-center">
              {isLoading ? 'This may take a moment depending on how many repositories you have starred.' : ''}
            </p>
          </form>
        </CardContent>
      </Card>

      {noStars && (
  <Card className="w-full max-w-md mx-auto bg-white">
    <CardHeader className="pb-2">
      <CardTitle className="text-xl font-bold text-gray-900">No Stars Found</CardTitle>
      <p className="text-gray-500 text-sm">This GitHub user doesn't have any starred repositories yet.</p>
    </CardHeader>
    <CardContent>
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
        <h3 className="font-medium text-blue-800 mb-2">Here's a fun developer fact instead:</h3>
        <p className="text-gray-700 italic">{devFact}</p>
      </div>
    </CardContent>
  </Card>
)}

      {categories && (
  <Card className="w-full max-w-5xl mx-auto bg-white">
    <CardHeader className="pb-2">
      <CardTitle className="text-2xl font-bold text-gray-900">Starred Repository Categories</CardTitle>
      <p className="text-gray-500 text-sm">We analyzed your starred repositories and grouped them by category.</p>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(categories).map(([category, repos]) => (
          <div key={category} className="border rounded-lg p-4 bg-gray-50 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 text-lg">
                {category}
              </h3>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {Array.isArray(repos) ? repos.length : 0}
              </span>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {Array.isArray(repos) && repos.map((repo) => (
                <div key={repo} className="bg-white p-2 rounded border hover:bg-gray-50">
                  <a
                    href={`https://github.com/${repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span className="truncate">{repo}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)}
    </div>
  )
}