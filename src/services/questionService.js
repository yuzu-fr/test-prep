import { supabase } from '../lib/supabaseClient'

/**
 * Fetch questions for practice mode (filtered by category)
 * @param {string} categoryId 
 */
export async function fetchPracticeQuestions(categoryId) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('module_id', categoryId)
    .order('order_index', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Fetch module info by ID
 * @param {string} moduleId 
 */
export async function fetchModuleInfo(moduleId) {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('id', moduleId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Fetch all questions for a specific exam type (CSP or CR) 
 * used for exam generation.
 * @param {string} examType 'CSP' | 'CR'
 */
export async function fetchAllQuestionsForExam(examType) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('exam_type', examType)

  if (error) throw error
  return data
}

/**
 * Fetch official thematic modules for practice mode
 * @param {string} examType 'CSP' | 'CR'
 */
export async function fetchThematicCategories(examType) {
  console.log('[questionService] fetchModules for:', examType);
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('exam_type', examType)
    .order('order_index', { ascending: true })

  if (error) {
    console.error('[questionService] fetchModules error:', error);
    throw error
  }
  return data
}
