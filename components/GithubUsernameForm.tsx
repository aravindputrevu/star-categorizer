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

  const validateUsername = (value: string) => {
    const regex = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i
    return regex.test(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCategories(null)

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
      if (data.categories) {
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
          <CardTitle className="text-2xl font-bold text-center">GitHub Username Validator</CardTitle>
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
              {isLoading ? 'Processing...' : 'Submit'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {categories && (
  <Card className="w-full max-w-4xl mx-auto bg-white">
    <CardHeader>
      <CardTitle className="text-xl">GitHub Repository Categories</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(categories).map(([category, repos]) => (
          <div key={category} className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">
                {category}
              </h3>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                {repos.length}
              </span>
            </div>
            <div className="space-y-2">
              {repos.map((repo) => (
                <div key={repo} className="bg-white p-2 rounded border">
                  <a
                    href={`https://github.com/${repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                  >
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