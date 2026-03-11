import { createClient } from '@supabase/supabase-js';

let supabase = null;

function getSupabaseClient() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
  return supabase;
}

/**
 * Question to Objective Mapping Service
 * Handles finding which objective a question/checkpoint belongs to
 */
export class QuestionObjectiveMappingService {
  /**
   * Find which objective a checkpoint belongs to
   */
  async findCheckpointObjective(checkpointId) {
    try {
      console.log('Looking for objective for checkpointId:', checkpointId);
      
      // Find the objective that this question/checkpoint is linked to
      const { data, error } = await getSupabaseClient()
        .from('set_question_objectives')
        .select(`
          objective_id,
          objectives!inner(
            id,
            objective,
            mastery_level,
            attempts,
            last_practiced
          )
        `)
        .eq('question_id', checkpointId)
        .single();

      console.log('set_question_objectives query result:', { data, error });

      if (error) {
        console.log('No objective found for checkpoint:', checkpointId, 'creating dynamic objective...');
        
        // Create a dynamic objective for this question
        const dynamicObjectiveId = await this.createDynamicObjective(checkpointId);
        
        return {
          objectiveId: dynamicObjectiveId,
          objectiveDescription: `Objective for Question ${checkpointId}`,
          contentNodeId: 'dynamic-node'
        };
      }

      const objective = data.objectives;
      console.log('Found objective:', objective);
      
      return {
        objectiveId: objective.id,
        objectiveDescription: objective.objective,
        contentNodeId: 'mock-node-1' // We'll need to join with content_nodes if needed
      };

    } catch (error) {
      console.error('Error finding checkpoint objective:', error);
      
      // Create a dynamic objective as fallback
      const dynamicObjectiveId = await this.createDynamicObjective(checkpointId);
      
      return {
        objectiveId: dynamicObjectiveId,
        objectiveDescription: `Objective for Question ${checkpointId}`,
        contentNodeId: 'dynamic-node'
      };
    }
  }

  /**
   * Create a dynamic objective for unmapped questions
   */
  async createDynamicObjective(checkpointId) {
    try {
      const objectiveId = `dynamic-obj-${checkpointId}`;
      const objectiveName = `Learning Objective for Question ${checkpointId}`;
      
      // Check if objective already exists
      const { data: existing } = await getSupabaseClient()
        .from('objectives')
        .select('id')
        .eq('id', objectiveId)
        .single();
      
      if (existing) {
        console.log('Dynamic objective already exists:', objectiveId);
        return objectiveId;
      }
      
      // Create the objective
      const { data, error } = await getSupabaseClient()
        .from('objectives')
        .insert({
          id: objectiveId,
          objective: objectiveName,
          mastery_level: 0.5, // Start at 50%
          confidence_score: 0.5,
          alpha: 1.0,
          beta: 1.0,
          attempts: 0
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating dynamic objective:', error);
        return objectiveId; // Return ID anyway, let mastery update handle it
      }
      
      console.log('Created dynamic objective:', data);
      return objectiveId;
      
    } catch (error) {
      console.error('Error in createDynamicObjective:', error);
      return `dynamic-obj-${checkpointId}`;
    }
  }

  /**
   * Get all objectives for a drill (based on checkpoints in the drill)
   */
  async getDrillObjectives(drillId) {
    try {
      console.log('Getting real objectives for drill:', drillId);
      
      // Get all questions in this drill
      const { data: drillQuestions, error: drillError } = await getSupabaseClient()
        .from('set_questions')
        .select('id')
        .eq('set_id', drillId);

      if (drillError) throw drillError;

      if (!drillQuestions || drillQuestions.length === 0) {
        console.log('No questions found for drill:', drillId);
        return [];
      }

      const questionIds = drillQuestions.map(q => q.id);

      // Get all objectives linked to these questions
      const { data: objectives, error: objectiveError } = await getSupabaseClient()
        .from('set_question_objectives')
        .select(`
          objectives!inner(
            id,
            objective,
            mastery_level,
            attempts,
            last_practiced,
            content_node
          )
        `)
        .in('question_id', questionIds);

      if (objectiveError) throw objectiveError;

      // Remove duplicates and format
      const uniqueObjectives = [];
      const seenIds = new Set();

      for (const item of objectives || []) {
        const obj = item.objectives;
        if (!seenIds.has(obj.id)) {
          seenIds.add(obj.id);
          uniqueObjectives.push({
            id: obj.id,
            objective: obj.objective,
            mastery_level: obj.mastery_level || 0,
            confidence: 0.8, // Default confidence
            attempts: obj.attempts || 0,
            last_practiced: obj.last_practiced,
            checkpoints: [],
            content_node: obj.content_node,
            contentNodeTitle: 'Content Node' // We could join with content_nodes if needed
          });
        }
      }

      console.log('Found objectives:', uniqueObjectives.length);
      return uniqueObjectives;
      
    } catch (error) {
      console.error('Error getting drill objectives:', error);
      return [];
    }
  }

  /**
   * Get objectives for a content node
   */
  async getNodeObjectives(contentNodeId) {
    try {
      const { data, error } = await getSupabaseClient()
        .from('objectives')
        .select(`
          id,
          objective,
          mastery_level,
          confidence_score,
          attempts,
          last_practiced,
          checkpoints,
          weight
        `)
        .eq('content_node_id', contentNodeId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data.map(obj => ({
        id: obj.id,
        objective: obj.objective,
        masteryLevel: obj.mastery_level || 0,
        confidence: obj.confidence_score || 0,
        attempts: obj.attempts || 0,
        lastPracticed: obj.last_practiced,
        checkpoints: obj.checkpoints || [],
        weight: obj.weight || 5
      }));

    } catch (error) {
      console.error('Error getting node objectives:', error);
      return [];
    }
  }

  /**
   * Get all objectives for a folder
   */
  async getFolderObjectives(folderId) {
    try {
      const { data, error } = await getSupabaseClient()
        .from('objectives')
        .select(`
          id,
          objective,
          mastery_level,
          confidence_score,
          attempts,
          last_practiced,
          checkpoints,
          weight,
          content_node_id!inner(
            id,
            title
          )
        `)
        .eq('content_node_id.folder_id', folderId)
        .order('content_node_id.created_at', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      const folderObjectives = {};
      
      data.forEach(obj => {
        const nodeId = obj.content_node_id.id;
        
        if (!folderObjectives[nodeId]) {
          folderObjectives[nodeId] = {
            id: nodeId,
            title: obj.content_node_id.title,
            objectives: []
          };
        }

        folderObjectives[nodeId].objectives.push({
          id: obj.id,
          objective: obj.objective,
          masteryLevel: obj.mastery_level || 0,
          confidence: obj.confidence_score || 0,
          attempts: obj.attempts || 0,
          lastPracticed: obj.last_practiced,
          checkpoints: obj.checkpoints || [],
          weight: obj.weight || 5
        });
      });

      return folderObjectives;

    } catch (error) {
      console.error('Error getting folder objectives:', error);
      return {};
    }
  }

  /**
   * Create objectives from content node data (migration helper)
   */
  async createObjectivesFromContentNode(contentNodeId, objectivesData) {
    try {
      const objectivesToInsert = objectivesData.map(obj => ({
        content_node_id: contentNodeId,
        objective: obj.objective,
        weight: obj.weight || 5,
        checkpoints: obj.checkpoints || [],
        alpha: 1.0,
        beta: 1.0,
        mastery_level: 0.0,
        attempts: 0,
        confidence_score: 0.0
      }));

      const { data, error } = await getSupabaseClient()
        .from('objectives')
        .insert(objectivesToInsert)
        .select();

      if (error) throw error;

      return data;

    } catch (error) {
      console.error('Error creating objectives from content node:', error);
      throw error;
    }
  }

  /**
   * Get checkpoint details with objective information
   */
  async getCheckpointWithObjective(checkpointId) {
    try {
      // Get checkpoint details
      const { data: checkpoint, error: checkpointError } = await getSupabaseClient()
        .from('checkpoints')
        .select('id, question, difficulty, options')
        .eq('id', checkpointId)
        .single();

      if (checkpointError) throw checkpointError;

      // Find objective
      const objectiveInfo = await this.findCheckpointObjective(checkpointId);

      return {
        ...checkpoint,
        objective: objectiveInfo
      };

    } catch (error) {
      console.error('Error getting checkpoint with objective:', error);
      throw error;
    }
  }

  /**
   * Update checkpoint to objective mapping (when objectives are reorganized)
   */
  async updateCheckpointObjectiveMapping(objectiveId, checkpointIds) {
    try {
      const { data, error } = await getSupabaseClient()
        .from('objectives')
        .update({ 
          checkpoints: checkpointIds,
          updated_at: new Date().toISOString()
        })
        .eq('id', objectiveId)
        .select();

      if (error) throw error;

      return data[0];

    } catch (error) {
      console.error('Error updating checkpoint objective mapping:', error);
      throw error;
    }
  }
}

export const questionObjectiveMappingService = new QuestionObjectiveMappingService();
