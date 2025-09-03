'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import PortfolioTracker from '../components/PortfolioTracker'

export default function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get existing user session
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithEmail = async () => {
    const email = prompt('Enter your email:')
    if (email) {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) {
        alert('Error: ' + error.message)
      } else {
        alert('Check your email for the login link!')
      }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Portfolio Tracker</h1>
          <p className="text-gray-600 mb-6">Sign in to access your portfolio</p>
          <button
            onClick={signInWithEmail}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In with Email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="absolute top-4 right-4">
        <button
          onClick={signOut}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          Sign Out ({user.email})
        </button>
      </div>
      <PortfolioTracker user={user} />
    </div>
  )
}