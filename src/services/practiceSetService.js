import { supabase } from '../lib/supabase';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "";

/**
 * Get all practice sets for the current user
 */
export async function listPracticeSets(filters = {}) {
  try {
    let query = supabase
      .from('practice_sets')
      .select(`
        *,
        set_questions(count),
        objectives:practice_set_objectives(
          objectives(id, objective, mastery_level)
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }
    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error listing practice sets:', error);
    throw error;
  }
}

/**
 * Get a specific practice set by ID
 */
export async function getPracticeSet(setId) {
  try {
    const { data, error } = await supabase
      .from('practice_sets')
      .select(`
        *,
        set_questions(
          id, question, difficulty, order,
          set_question_options(id, text, correct, explanation)
        ),
        objectives:practice_set_objectives(
          objectives(id, objective, mastery_level, description)
        )
      `)
      .eq('id', setId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting practice set:', error);
    throw error;
  }
}

/**
 * Create a new practice set
 */
export async function createPracticeSet(setData) {
  try {
    const { data, error } = await supabase
      .from('practice_sets')
      .insert({
        title: setData.title,
        description: setData.description,
        difficulty: setData.difficulty || 'intermediate',
        estimated_duration: setData.estimated_duration || 30,
        created_by: 'current-user' // TODO: Get actual user ID
      })
      .select()
      .single();

    if (error) throw error;
    
    // Create objectives if provided
    if (setData.objectives && setData.objectives.length > 0) {
      for (const obj of setData.objectives) {
        await supabase
          .from('objectives')
          .insert({
            id: obj.id,
            objective: obj.objective,
            description: obj.description,
            difficulty: obj.difficulty || 'intermediate',
            mastery_level: 0.5,
            confidence_score: 0.5,
            alpha: 1.0,
            beta: 1.0,
            attempts: 0
          });

        // Link objective to practice set
        await supabase
          .from('practice_set_objectives')
          .insert({
            practice_set_id: data.id,
            objective_id: obj.id
          });
      }
    }

    // Create questions if provided
    if (setData.questions && setData.questions.length > 0) {
      for (let i = 0; i < setData.questions.length; i++) {
        const q = setData.questions[i];
        
        // Create question
        const { data: question } = await supabase
          .from('set_questions')
          .insert({
            set_id: data.id,
            question: q.question,
            difficulty: q.difficulty,
            order: i + 1
          })
          .select()
          .single();

        // Create options
        for (const option of q.options) {
          await supabase
            .from('set_question_options')
            .insert({
              question_id: question.id,
              text: option.text,
              correct: option.isCorrect,
              explanation: option.explanation
            });
        }

        // Map to objectives
        if (q.objectiveIds && q.objectiveIds.length > 0) {
          for (const objectiveId of q.objectiveIds) {
            await supabase
              .from('set_question_objectives')
              .insert({
                question_id: question.id,
                objective_id: objectiveId
              });
          }
        }
      }
    }

    return data;
  } catch (error) {
    console.error('Error creating practice set:', error);
    throw error;
  }
}

/**
 * Update an existing practice set
 */
export async function updatePracticeSet(setId, updates) {
  try {
    const { data, error } = await supabase
      .from('practice_sets')
      .update({
        title: updates.title,
        description: updates.description,
        difficulty: updates.difficulty,
        estimated_duration: updates.estimated_duration,
        updated_at: new Date().toISOString()
      })
      .eq('id', setId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating practice set:', error);
    throw error;
  }
}

/**
 * Rename a practice set
 */
export async function renamePracticeSet(setId, newTitle) {
  return updatePracticeSet(setId, { title: newTitle });
}

/**
 * Delete a practice set
 */
export async function deletePracticeSet(setId) {
  try {
    // Delete related records first (due to foreign key constraints)
    await supabase
      .from('set_question_options')
      .delete()
      .in('question_id', 
        supabase
          .from('set_questions')
          .select('id')
          .eq('set_id', setId)
      );

    await supabase
      .from('set_question_objectives')
      .delete()
      .in('question_id',
        supabase
          .from('set_questions')
          .select('id')
          .eq('set_id', setId)
      );

    await supabase
      .from('set_questions')
      .delete()
      .eq('set_id', setId);

    await supabase
      .from('practice_set_objectives')
      .delete()
      .eq('practice_set_id', setId);

    // Delete the practice set
    const { data, error } = await supabase
      .from('practice_sets')
      .delete()
      .eq('id', setId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error deleting practice set:', error);
    throw error;
  }
}

/**
 * Duplicate a practice set
 */
export async function duplicatePracticeSet(setId, newTitle) {
  try {
    const originalSet = await getPracticeSet(setId);
    
    const duplicatedSet = {
      title: newTitle || `${originalSet.title} (Copy)`,
      description: originalSet.description,
      difficulty: originalSet.difficulty,
      estimated_duration: originalSet.estimated_duration,
      questions: originalSet.set_questions.map(q => ({
        question: q.question,
        difficulty: q.difficulty,
        options: q.set_question_options.map(o => ({
          text: o.text,
          isCorrect: o.correct,
          explanation: o.explanation
        })),
        objectiveIds: [] // TODO: Map objectives from original set
      }))
    };

    return await createPracticeSet(duplicatedSet);
  } catch (error) {
    console.error('Error duplicating practice set:', error);
    throw error;
  }
}

/**
 * Get practice set statistics
 */
export async function getPracticeSetStats(setId) {
  try {
    const { data, error } = await supabase
      .from('practice_sets')
      .select(`
        *,
        set_questions(count),
        question_attempts!inner(
          correct, 
          confidence,
          time_taken_ms,
          created_at
        )
      `)
      .eq('id', setId)
      .single();

    if (error) throw error;

    const stats = {
      totalQuestions: data.set_questions?.[0]?.count || 0,
      totalAttempts: data.question_attempts?.length || 0,
      correctAttempts: data.question_attempts?.filter(a => a.correct).length || 0,
      averageAccuracy: data.question_attempts?.length > 0 
        ? (data.question_attempts.filter(a => a.correct).length / data.question_attempts.length) * 100 
        : 0,
      averageConfidence: data.question_attempts?.length > 0
        ? data.question_attempts.reduce((sum, a) => sum + a.confidence, 0) / data.question_attempts.length
        : 0,
      averageTime: data.question_attempts?.length > 0
        ? data.question_attempts.reduce((sum, a) => sum + a.time_taken_ms, 0) / data.question_attempts.length
        : 0
    };

    return stats;
  } catch (error) {
    console.error('Error getting practice set stats:', error);
    throw error;
  }
}
