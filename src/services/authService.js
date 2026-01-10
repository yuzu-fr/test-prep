import { ref } from 'vue'
import { supabase } from '../lib/supabaseClient'

export const user = ref(null)

function mapUser(supabaseUser) {
  if (!supabaseUser) return null
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    displayName: supabaseUser.user_metadata?.username || supabaseUser.email.split('@')[0],
    avatar: supabaseUser.user_metadata?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${supabaseUser.id}`,
    joinedAt: supabaseUser.created_at
  }
}

// Initialize user from current session
supabase.auth.getSession().then(({ data: { session } }) => {
  user.value = mapUser(session?.user)
})

// Listen for auth changes
supabase.auth.onAuthStateChange((_event, session) => {
  user.value = mapUser(session?.user)
})

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  return data
}

export async function register(username, email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
      }
    }
  })
  
  if (error) throw error
  return data
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const isAuthenticated = () => !!user.value
