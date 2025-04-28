'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

interface Category {
  id: number
  name: string
  repositoryCount: number
}

export default function SavedLists() {
  const [lists, setLists] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  useEffect(() => {
    async function fetchLists() {
      try {
        const response = await fetch('/api/lists')
        
        if (!response.ok) {
          throw new Error('Failed to fetch saved lists')
        }
        
        const data = await response.json()
        setLists(data.lists || [])
      } catch (error: any) {
        console.error('Error fetching lists:', error)
        setError(error.message || 'Failed to load saved lists')
        toast.error('Failed to load saved lists')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchLists()
  }, [])
  
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Your Saved Lists</h1>
          <p className="text-gray-500">All your categorized GitHub star collections</p>
        </div>
        <Link href="/">
          <Button variant="outline">Categorize More Stars</Button>
        </Link>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800"></div>
          <span className="ml-3 text-gray-600">Loading your lists...</span>
        </div>
      ) : error ? (
        <Card className="bg-red-50 border-red-100">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
            <p className="text-sm text-gray-600 mt-2">
              This could be caused by a configuration issue or if the database is not accessible.
            </p>
          </CardContent>
        </Card>
      ) : lists.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center p-6">
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Saved Lists Yet</h3>
              <p className="text-gray-500 mb-4">
                You haven't saved any categorized GitHub star lists yet.
              </p>
              <Link href="/">
                <Button>Categorize Your Stars</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => (
            <Card key={list.id} className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center">
                  <span className="text-lg font-semibold truncate" title={list.name}>
                    {list.name}
                  </span>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {list.repositoryCount}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <Link href={`/api/lists/${list.id}/stars`} passHref>
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                      View Repositories
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}