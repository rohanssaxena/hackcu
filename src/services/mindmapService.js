import { supabase } from '../lib/supabase';

/**
 * Mindmap view types
 */
export const MINDMAP_VIEWS = {
  HIERARCHICAL: 'hierarchical',
  LINEAR: 'linear', 
  HEATMAP: 'heatmap',
  PATH: 'path'
};

/**
 * Get all objectives for mindmap display
 */
export async function getMindmapObjectives(filters = {}) {
  try {
    let query = supabase
      .from('objectives')
      .select(`
        *,
        parent_objective:parent_id(
          id, objective, mastery_level
        ),
        child_objectives:objectives(
          id, objective, mastery_level, difficulty
        ),
        question_attempts(
          correct, confidence, time_taken_ms, created_at
        )
      `)
      .order('objective');

    // Apply filters
    if (filters.masteryRange) {
      query = query
        .gte('mastery_level', filters.masteryRange[0])
        .lte('mastery_level', filters.masteryRange[1]);
    }
    
    if (filters.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }
    
    if (filters.search) {
      query = query.ilike('objective', `%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting mindmap objectives:', error);
    throw error;
  }
}

/**
 * Get objectives in hierarchical tree structure
 */
export async function getHierarchicalObjectives(parentId = null) {
  try {
    const { data, error } = await supabase
      .from('objectives')
      .select(`
        *,
        child_objectives:objectives(
          id, objective, mastery_level, difficulty, attempts
        )
      `)
      .eq('parent_id', parentId)
      .order('objective');

    if (error) throw error;
    
    // Recursively build tree
    const tree = [];
    for (const node of data || []) {
      const children = await getHierarchicalObjectives(node.id);
      tree.push({
        ...node,
        children
      });
    }
    
    return tree;
  } catch (error) {
    console.error('Error getting hierarchical objectives:', error);
    throw error;
  }
}

/**
 * Get learning path (recommended order)
 */
export async function getLearningPath(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('objectives')
      .select(`
        *,
        question_attempts(
          correct, confidence, time_taken_ms, created_at
        )
      `)
      .order('mastery_level', { ascending: true })
      .order('attempts', { ascending: true })
      .limit(limit);

    if (error) throw error;
    
    // Calculate priority score
    const prioritized = (data || []).map(obj => {
      const masteryLevel = obj.mastery_level || 0;
      const attempts = obj.attempts || 0;
      const recentAttempts = obj.question_attempts?.filter(
        a => new Date(a.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length || 0;
      
      // Priority: lower mastery + fewer attempts + recent activity
      const priority = (1 - masteryLevel) * 0.5 + (1 - Math.min(attempts / 10, 1)) * 0.3 + (recentAttempts > 0 ? 0.2 : 0);
      
      return {
        ...obj,
        priority,
        recommendedOrder: attempts === 0 ? 'new' : masteryLevel < 0.6 ? 'focus' : 'practice'
      };
    }).sort((a, b) => b.priority - a.priority);
    
    return prioritized;
  } catch (error) {
    console.error('Error getting learning path:', error);
    throw error;
  }
}

/**
 * Get mindmap statistics
 */
export async function getMindmapStats() {
  try {
    const { data, error } = await supabase
      .from('objectives')
      .select(`
        mastery_level, 
        difficulty, 
        attempts,
        question_attempts(
          correct, confidence, time_taken_ms
        )
      `);

    if (error) throw error;
    
    const stats = {
      totalObjectives: data?.length || 0,
      masteryDistribution: {
        notStarted: data?.filter(o => (o.mastery_level || 0) < 0.2).length || 0,
        struggling: data?.filter(o => (o.mastery_level || 0) >= 0.2 && (o.mastery_level || 0) < 0.4).length || 0,
        progressing: data?.filter(o => (o.mastery_level || 0) >= 0.4 && (o.mastery_level || 0) < 0.8).length || 0,
        mastered: data?.filter(o => (o.mastery_level || 0) >= 0.8).length || 0
      },
      difficultyDistribution: {
        beginner: data?.filter(o => o.difficulty === 'beginner').length || 0,
        intermediate: data?.filter(o => o.difficulty === 'intermediate').length || 0,
        advanced: data?.filter(o => o.difficulty === 'advanced').length || 0
      },
      averageMastery: data?.length > 0 
        ? data.reduce((sum, o) => sum + (o.mastery_level || 0), 0) / data.length 
        : 0,
      totalAttempts: data?.reduce((sum, o) => sum + (o.attempts || 0), 0) || 0,
      averageConfidence: data?.length > 0 && data.some(o => o.question_attempts?.length > 0)
        ? data.flatMap(o => o.question_attempts || [])
            .reduce((sum, a) => sum + (a.confidence || 0), 0) / 
          data.flatMap(o => o.question_attempts || []).length
        : 0
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting mindmap stats:', error);
    throw error;
  }
}

/**
 * Search objectives
 */
export async function searchObjectives(query, filters = {}) {
  try {
    let supabaseQuery = supabase
      .from('objectives')
      .select(`
        *,
        parent_objective:parent_id(
          id, objective
        ),
        question_attempts(
          correct, confidence, created_at
        )
      `)
      .ilike('objective', `%${query}%`)
      .order('objective');

    // Apply additional filters
    if (filters.masteryMin !== undefined) {
      supabaseQuery = supabaseQuery.gte('mastery_level', filters.masteryMin);
    }
    if (filters.masteryMax !== undefined) {
      supabaseQuery = supabaseQuery.lte('mastery_level', filters.masteryMax);
    }
    if (filters.difficulty) {
      supabaseQuery = supabaseQuery.eq('difficulty', filters.difficulty);
    }

    const { data, error } = await supabaseQuery;

    if (error) throw error;
    
    // Calculate relevance score
    const results = (data || []).map(obj => {
      const exactMatch = obj.objective.toLowerCase() === query.toLowerCase();
      const startsWith = obj.objective.toLowerCase().startsWith(query.toLowerCase());
      const contains = obj.objective.toLowerCase().includes(query.toLowerCase());
      
      let relevanceScore = 0;
      if (exactMatch) relevanceScore = 100;
      else if (startsWith) relevanceScore = 80;
      else if (contains) relevanceScore = 60;
      
      // Boost by mastery level (lower mastery gets higher relevance for learning)
      relevanceScore += (1 - (obj.mastery_level || 0)) * 20;
      
      return {
        ...obj,
        relevanceScore
      };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return results;
  } catch (error) {
    console.error('Error searching objectives:', error);
    throw error;
  }
}

/**
 * Get objectives by mastery level range
 */
export async function getObjectivesByMastery(minMastery, maxMastery) {
  try {
    const { data, error } = await supabase
      .from('objectives')
      .select(`
        *,
        question_attempts(
          correct, confidence, time_taken_ms, created_at
        )
      `)
      .gte('mastery_level', minMastery)
      .lte('mastery_level', maxMastery)
      .order('mastery_level', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting objectives by mastery:', error);
    throw error;
  }
}

/**
 * Get recently practiced objectives
 */
export async function getRecentObjectives(days = 7, limit = 10) {
  try {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('objectives')
      .select(`
        *,
        question_attempts(
          correct, confidence, time_taken_ms, created_at
        )
      `)
      .gte('last_practiced', cutoffDate)
      .order('last_practiced', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting recent objectives:', error);
    throw error;
  }
}

/**
 * Get struggling objectives (low mastery with multiple attempts)
 */
export async function getStrugglingObjectives(minAttempts = 3, maxMastery = 0.4) {
  try {
    const { data, error } = await supabase
      .from('objectives')
      .select(`
        *,
        question_attempts(
          correct, confidence, time_taken_ms, created_at
        )
      `)
      .gte('attempts', minAttempts)
      .lte('mastery_level', maxMastery)
      .order('mastery_level', { ascending: true })
      .order('attempts', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting struggling objectives:', error);
    throw error;
  }
}

/**
 * Save user's preferred mindmap view
 */
export async function saveMindmapPreferences(userId, preferences) {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        mindmap_view: preferences.view,
        mindmap_filters: preferences.filters,
        mindmap_sort: preferences.sort,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving mindmap preferences:', error);
    throw error;
  }
}

/**
 * Get user's mindmap preferences
 */
export async function getMindmapPreferences(userId) {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('mindmap_view, mindmap_filters, mindmap_sort')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }
    
    return data || {
      mindmap_view: MINDMAP_VIEWS.HIERARCHICAL,
      mindmap_filters: {},
      mindmap_sort: 'mastery'
    };
  } catch (error) {
    console.error('Error getting mindmap preferences:', error);
    return {
      mindmap_view: MINDMAP_VIEWS.HIERARCHICAL,
      mindmap_filters: {},
      mindmap_sort: 'mastery'
    };
  }
}
