'use client'

import { useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from 'react-hot-toast'

export default function GithubUsernameForm() {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<Record<string, string[]> | null>(null)
  const [devFact, setDevFact] = useState('')
  const [noStars, setNoStars] = useState(false)
  const [starCount, setStarCount] = useState(0)
  const [processingTime, setProcessingTime] = useState('')
  const [categoryCount, setCategoryCount] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('Analyzing Stars...')
  const [isCreatingList, setIsCreatingList] = useState(false)
  const [creatingListCategory, setCreatingListCategory] = useState('')

  // Validate GitHub username format
  const validateUsername = useCallback((value: string) => {
    const regex = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i
    return regex.test(value)
  }, [])

  // Reset all state
  const resetState = useCallback(() => {
    setError('')
    setCategories(null)
    setDevFact('')
    setNoStars(false)
    setStarCount(0)
    setProcessingTime('')
    setCategoryCount(0)
    setLoadingMessage('Analyzing Stars...')
  }, [])

  // Loading message rotator
  const startLoadingMessages = useCallback(() => {
    const messages = [
      'Fetching GitHub stars...',
      'Analyzing repository data...',
      'Categorizing by purpose and technology...',
      'Organizing your stars...',
      'Preparing results...',
      'Almost there...'
    ]
    let index = 0
    
    const intervalId = setInterval(() => {
      setLoadingMessage(messages[index % messages.length])
      index++
    }, 3500)
    
    return () => clearInterval(intervalId)
  }, [])

  // Handle form submission to save to SQLite DB
  const handleCreateGitHubList = useCallback(async (category: string, repositories: string[]) => {
    if (!username) {
      toast.error('Username is required to create a list')
      return
    }
    
    setIsCreatingList(true)
    setCreatingListCategory(category)
    
    try {
      // Save to local SQLite database
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryName: category,
          repositories: repositories.map(repo => ({
            full_name: repo,
            description: null // We don't have descriptions in the current UI flow
          }))
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save category to database')
      }
      
      const data = await response.json()
      
      // Also create GitHub list for backward compatibility
      try {
        const createResponse = await fetch('/api/github-lists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            listName: category,
            description: `Categorized stars: ${category}`
          })
        })
        
        if (createResponse.ok) {
          const addResponse = await fetch('/api/github-lists', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username,
              listName: category,
              repositories
            })
          })
          
          if (addResponse.ok) {
            const addData = await addResponse.json()
            console.log(`Also synced to GitHub list: ${addData.addedCount} repositories`)
          }
        }
      } catch (githubError) {
        console.error('GitHub sync failed but local save succeeded', githubError)
        // Continue since local save succeeded
      }
      
      toast.success(`Saved category "${category}" with ${data.addedCount} repositories`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to save category')
    } finally {
      setIsCreatingList(false)
      setCreatingListCategory('')
    }
  }, [username])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    resetState()

    if (!validateUsername(username)) {
      setError('Invalid GitHub username')
      return
    }

    setIsLoading(true)
    const stopMessageRotation = startLoadingMessages()

    try {
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout
      
      const response = await fetch('/api/compute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId) // Clear the timeout

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to process')
      }

      const data = await response.json()
      
      // Process response data
      if (data.starredCount !== undefined) setStarCount(data.starredCount)
      if (data.processingTime) setProcessingTime(data.processingTime)
      if (data.categoryCount) setCategoryCount(data.categoryCount)
      
      if (data.noStars) {
        setNoStars(true)
        setDevFact(data.devFact || 'Did you know? The average programmer spends 30-50% of their time debugging code.')
      } else if (data.categories) {
        setCategories(data.categories)
      } else {
        setError('No repository data available')
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setError('Request timed out. Try again with a different username or fewer stars.')
      } else {
        setError(error.message || 'An error occurred while processing the request')
      }
    } finally {
      stopMessageRotation()
      setIsLoading(false)
    }
  }, [username, validateUsername, resetState, startLoadingMessages])

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
              {isLoading ? loadingMessage : 'Categorize Stars'}
            </Button>
            <p className="text-xs text-gray-400 text-center">
              {isLoading ? 'This may take a moment depending on how many repositories you have starred. Large collections will be processed in batches.' : ''}
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
      <div className="flex flex-col md:flex-row md:justify-between md:items-center">
        <p className="text-gray-500 text-sm">We analyzed your {starCount} starred repositories and grouped them into {categoryCount} categories.</p>
        {processingTime && (
          <p className="text-gray-400 text-xs mt-1 md:mt-0">Processing time: {processingTime}</p>
        )}
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(categories)
          .sort((a, b) => (b[1] as string[]).length - (a[1] as string[]).length)
          .map(([category, repos]) => {
            if (!Array.isArray(repos) || repos.length === 0) return null;
            
            return (
              <div key={category} className="border rounded-lg p-3 bg-gray-50 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-800 text-lg truncate" title={category}>
                    {category}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleCreateGitHubList(category, repos)}
                      className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full hover:bg-green-200 flex items-center"
                      title="Save List"
                      disabled={isCreatingList}
                    >
                      {isCreatingList && creatingListCategory === category ? (
                        <span className="flex items-center">
                          <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Save List
                        </span>
                      )}
                    </button>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {repos.length}
                    </span>
                  </div>
                </div>
                <div className="space-y-1 max-h-56 overflow-y-auto pr-1 overscroll-contain">
                  {repos.map((repo) => (
                    <div key={repo} className="bg-white p-2 rounded border hover:bg-gray-50">
                      <a
                        href={`https://github.com/${repo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        <span className="truncate">{repo}</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    </CardContent>
  </Card>
)}
    </div>
  )
}
