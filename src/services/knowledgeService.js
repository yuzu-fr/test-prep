import { supabase } from '../lib/supabaseClient'

/**
 * Fetch all categories for Knowledge Home
 */
export async function fetchKnowledgeCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('id', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Fetch knowledge cards for a specific category
 * @param {string} categoryId 
 */
export async function fetchKnowledgeCards(categoryId) {
  const { data, error } = await supabase
    .from('knowledge_cards')
    .select('*')
    .eq('category_id', categoryId)
    .order('timeline_order', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Fetch knowledge table data for a specific category
 * @param {string} categoryId 
 */
export async function fetchKnowledgeTable(categoryId) {
  const { data, error } = await supabase
    .from('knowledge_tables')
    .select('*')
    .eq('category_id', categoryId)
    .maybeSingle()

  if (error) throw error
  return data
}
