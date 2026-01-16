import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.SUPABASE_URL
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Comment = {
  id: string
  content: string
  created_at: string
  author_name: string
  author_avatar: string | null
  post_slug: string
}

export async function getComments(postSlug: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_slug', postSlug)
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('Error fetching comments:', error)
    return []
  }
  
  return data || []
}

export async function addComment(comment: Omit<Comment, 'id' | 'created_at'>): Promise<Comment | null> {
  const { data, error } = await supabase
    .from('comments')
    .insert([comment])
    .select()
    .single()
  
  if (error) {
    console.error('Error adding comment:', error)
    return null
  }
  
  return data
}