'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from 'next/link'

interface StarRecord {
  name: string
  description: string
  stars: number
  category: string
}

interface Developer {
  username: string
  displayName: string
  avatarUrl: string
  bio: string
  followers: number
  website: string
  company: string
  location: string
  starCategories: Record<string, string[]>
  topStars: StarRecord[]
  insightSummary: string
}

interface CatalogData {
  topDevelopers: Developer[]
}

export default function CatalogPage() {
  const [catalogData, setCatalogData] = useState<CatalogData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDeveloper, setSelectedDeveloper] = useState<Developer | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchCatalogData() {
      try {
        setIsLoading(true)
        const response = await fetch('/data/developer-catalog.json')
        if (!response.ok) {
          throw new Error('Failed to load catalog data')
        }
        const data = await response.json()
        setCatalogData(data)
        
        // Set the first developer as selected by default
        if (data.topDevelopers && data.topDevelopers.length > 0) {
          setSelectedDeveloper(data.topDevelopers[0])
        }
      } catch (err) {
        setError('Failed to load developer catalog data')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCatalogData()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading Developer Catalog</h2>
          <p className="text-gray-500">Fetching top developers and their star categories...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-500">{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 space-y-8">
      <header className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">GitHub Star Catalog</h1>
            <p className="text-gray-500">Discover how top developers organize their GitHub stars</p>
          </div>
          <div className="flex gap-2">
            <Link href="/catalog/add">
              <Button variant="default">
                Add Developer
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline">
                Try With Your Username
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {selectedDeveloper && (
        <section className="max-w-7xl mx-auto">
          <Card className="w-full bg-white">
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <img 
                  src={selectedDeveloper.avatarUrl} 
                  alt={selectedDeveloper.displayName}
                  className="w-16 h-16 rounded-full" 
                />
                <div className="flex-1">
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    {selectedDeveloper.displayName}
                    <a 
                      href={`https://github.com/${selectedDeveloper.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-sm text-blue-600 hover:underline"
                    >
                      @{selectedDeveloper.username}
                    </a>
                  </CardTitle>
                  <p className="text-gray-700">{selectedDeveloper.bio}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                    {selectedDeveloper.location && (
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {selectedDeveloper.location}
                      </span>
                    )}
                    {selectedDeveloper.company && (
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {selectedDeveloper.company}
                      </span>
                    )}
                    <span className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {selectedDeveloper.followers.toLocaleString()} followers
                    </span>
                    {selectedDeveloper.website && (
                      <a 
                        href={selectedDeveloper.website.startsWith('http') ? selectedDeveloper.website : `https://${selectedDeveloper.website}`} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center hover:text-blue-600"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Website
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="font-medium text-blue-800 mb-2">Developer Insight</h3>
                <p className="text-gray-700">{selectedDeveloper.insightSummary}</p>
              </div>

              <h3 className="text-xl font-semibold mb-4">Top Starred Repositories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {selectedDeveloper.topStars.map((repo) => (
                  <Card key={repo.name} className="hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <a
                          href={`https://github.com/${repo.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {repo.name.split('/')[1]}
                        </a>
                        <div className="flex items-center bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          {repo.stars.toLocaleString()}
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{repo.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          {repo.category}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <h3 className="text-xl font-semibold mb-4">Star Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(selectedDeveloper.starCategories)
                  .sort((a, b) => b[1].length - a[1].length)
                  .map(([category, repos]) => {
                    if (!Array.isArray(repos) || repos.length === 0) return null;
                    
                    return (
                      <div key={category} className="border rounded-lg p-3 bg-gray-50 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-800 text-lg truncate" title={category}>
                            {category}
                          </h3>
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {repos.length}
                          </span>
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
        </section>
      )}
    </div>
  )
}