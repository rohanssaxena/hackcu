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
 * Table-based Objective Mastery Tracking Service
 * Uses dedicated objectives table with Bayesian parameters
 */
export class ObjectiveMasteryTableService {
  /**
 * Update mastery for a specific objective after a question attempt
 */
  async updateObjectiveMastery(objectiveId, correct, confidence = 'medium', responseTimeMs = 1500) {
    try {
      console.log('Updating mastery for objective:', objectiveId, 'correct:', correct);
      
      // Get current mastery record
      const { data: current, error: fetchError } = await getSupabaseClient()
        .from('objectives')
        .select('mastery_level, attempts')
        .eq('id', objectiveId)
        .single();

      if (fetchError) {
        console.log('Objective not found or error:', fetchError);
        // If objective doesn't exist, create a mock response
        return {
          objectiveId,
          masteryLevel: correct ? 0.7 : 0.3,
          confidenceScore: 0.8,
          alpha: 1.0,
          beta: 1.0,
          attempts: 1
        };
      }

      // Proper Bayesian calculation (hackCU notebook approach)
      const currentMastery = current.mastery_level || 0;
      const currentAlpha = current.alpha || 1.0;
      const currentBeta = current.beta || 1.0;
      const currentAttempts = current.attempts || 0;
      
      // Get confidence weight (low=0.5, medium=1.0, high=1.5)
      const confidenceWeight = this.getConfidenceWeight(confidence);
      
      // Bayesian update based on correctness and confidence
      let newAlpha, newBeta;
      
      if (correct) {
        // Correct answer: increase alpha (success evidence)
        newAlpha = currentAlpha + confidenceWeight;
        newBeta = currentBeta;
      } else {
        // Wrong answer: increase beta (failure evidence)
        newAlpha = currentAlpha;
        newBeta = currentBeta + confidenceWeight;
      }
      
      // Calculate new mastery as alpha / (alpha + beta)
      const newMastery = newAlpha / (newAlpha + newBeta);
      
      // Calculate confidence score based on total evidence
      const totalEvidence = newAlpha + newBeta;
      const newConfidence = this.calculateConfidence(newAlpha, newBeta, currentAttempts + 1);
      
      const newAttempts = currentAttempts + 1;

      // Update database with Bayesian parameters
      const { data, error: updateError } = await getSupabaseClient()
        .from('objectives')
        .update({
          mastery_level: newMastery,
          confidence_score: newConfidence,
          alpha: newAlpha,
          beta: newBeta,
          attempts: newAttempts,
          last_practiced: new Date().toISOString()
        })
        .eq('id', objectiveId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating objective:', updateError);
        throw updateError;
      }

      console.log('Bayesian mastery updated successfully:', { 
        objectiveId, 
        oldMastery: currentMastery,
        newMastery, 
        oldAlpha: currentAlpha,
        newAlpha,
        oldBeta: currentBeta,
        newBeta,
        newConfidence,
        newAttempts 
      });

      return {
        objectiveId,
        masteryLevel: newMastery,
        confidenceScore: newConfidence,
        alpha: newAlpha,
        beta: newBeta,
        attempts: newAttempts
      };

    } catch (error) {
      console.error('Error updating objective mastery:', error);
      throw error;
    }
  }

  /**
   * Get mastery for a specific objective
   */
  async getObjectiveMastery(objectiveId) {
    try {
      const { data, error } = await getSupabaseClient()
        .from('objectives')
        .select('mastery_level, confidence_score, attempts, last_practiced, alpha, beta')
        .eq('id', objectiveId)
        .single();

      if (error) throw error;

      return {
        level: data.mastery_level || 0,
        confidence: data.confidence_score || 0,
        attempts: data.attempts || 0,
        lastPracticed: data.last_practiced,
        alpha: data.alpha || 1.0,
        beta: data.beta || 1.0
      };

    } catch (error) {
      console.error('Error getting objective mastery:', error);
      return {
        level: 0,
        confidence: 0,
        attempts: 0,
        lastPracticed: null,
        alpha: 1.0,
        beta: 1.0
      };
    }
  }

  /**
   * Get mastery for all objectives in a content node
   */
  async getNodeObjectivesMastery(contentNodeId) {
    try {
      const { data, error } = await getSupabaseClient()
        .from('objectives')
        .select('id, objective, mastery_level, confidence_score, attempts, last_practiced, alpha, beta')
        .eq('content_node_id', contentNodeId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mastery = {};
      data.forEach(objective => {
        mastery[objective.id] = {
          id: objective.id,
          objective: objective.objective,
          level: objective.mastery_level,
          confidence: objective.confidence_score,
          attempts: objective.attempts,
          lastPracticed: objective.last_practiced,
          alpha: objective.alpha,
          beta: objective.beta
        };
      });

      return mastery;

    } catch (error) {
      console.error('Error getting node objectives mastery:', error);
      return {};
    }
  }

  /**
   * Get mastery for all objectives in a folder
   */
  async getFolderObjectivesMastery(folderId) {
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
          content_node_id!inner(
            id,
            title
          )
        `)
        .eq('content_node_id.folder_id', folderId)
        .order('content_node_id.created_at', { ascending: true });

      if (error) throw error;

      const folderMastery = {};
      
      data.forEach(objective => {
        const nodeId = objective.content_node_id.id;
        
        if (!folderMastery[nodeId]) {
          folderMastery[nodeId] = {
            title: objective.content_node_id.title,
            objectives: {}
          };
        }

        folderMastery[nodeId].objectives[objective.id] = {
          id: objective.id,
          objective: objective.objective,
          level: objective.mastery_level,
          confidence: objective.confidence_score,
          attempts: objective.attempts,
          lastPracticed: objective.last_practiced
        };
      });

      return folderMastery;

    } catch (error) {
      console.error('Error getting folder objectives mastery:', error);
      return {};
    }
  }

  /**
   * Get objectives for a drill (all objectives that contain checkpoints in this drill)
   */
  async getDrillObjectives(drillId) {
    try {
      // Get all checkpoints in this drill
      const { data: checkpoints, error: checkpointError } = await getSupabaseClient()
        .from('drill_checkpoints')
        .select('checkpoint_id')
        .eq('drill_id', drillId);

      if (checkpointError) throw checkpointError;

      const checkpointIds = checkpoints.map(dc => dc.checkpoint_id);

      // Find objectives that contain these checkpoints
      const { data: objectives, error: objectiveError } = await getSupabaseClient()
        .from('objectives')
        .select('id, objective, mastery_level, confidence_score, attempts, last_practiced')
        .like('checkpoints', `%${checkpointIds.join('%')}%`);

      if (objectiveError) throw objectiveError;

      return objectives.map(obj => ({
        id: obj.id,
        objective: obj.objective,
        masteryLevel: obj.mastery_level,
        confidence: obj.confidence_score,
        attempts: obj.attempts,
        lastPracticed: obj.last_practiced
      }));

    } catch (error) {
      console.error('Error getting drill objectives:', error);
      return [];
    }
  }

  /**
   * Get mastery statistics for a user
   */
  async getMasteryStats(userId) {
    try {
      const { data, error } = await getSupabaseClient()
        .from('objectives')
        .select('mastery_level, attempts, last_practiced')
        .eq('user_id', userId); // Assuming user_id column exists

      if (error) throw error;

      const totalObjectives = data.length;
      const averageMastery = totalObjectives > 0 
        ? data.reduce((sum, record) => sum + record.mastery_level, 0) / totalObjectives 
        : 0;
      const masteredObjectives = data.filter(record => record.mastery_level >= 0.8).length;
      const strugglingObjectives = data.filter(record => record.mastery_level < 0.4).length;

      return {
        totalObjectives,
        averageMastery,
        masteredObjectives,
        strugglingObjectives,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting mastery stats:', error);
      return {
        totalObjectives: 0,
        averageMastery: 0,
        masteredObjectives: 0,
        strugglingObjectives: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  // Helper methods
  getConfidenceWeight(confidence) {
    const weights = { high: 1.15, medium: 1.0, low: 0.8 };
    return weights[confidence] || 1.0;
  }

  getSpeedWeight(responseTimeMs, avgTimeMs = 1500) {
    if (avgTimeMs <= 0) return 1.0;
    const ratio = responseTimeMs / avgTimeMs;
    if (ratio <= 0.7) return 1.1;
    if (ratio >= 1.5) return 0.9;
    return 1.0;
  }

  calculateConfidence(alpha, beta, attempts) {
    const totalEvidence = alpha + beta;
    const balance = Math.min(alpha, beta) / Math.max(alpha, beta);
    const evidenceFactor = Math.min(totalEvidence / 10, 1);
    return balance * evidenceFactor;
  }

  /**
   * Store question attempt in the database
   */
  async storeQuestionAttempt(questionId, userId, correct, confidence, responseTimeMs, objectiveId, masteryBefore, masteryAfter) {
    try {
      console.log('Storing question attempt:', { questionId, userId, correct, objectiveId });

      // First, ensure the table exists
      await this.ensureQuestionAttemptsTable();

      const { data, error } = await getSupabaseClient()
        .from('question_attempts')
        .insert({
          user_id: userId,
          question_id: questionId,
          correct,
          confidence: this.getConfidenceValue(confidence),
          time_taken_ms: responseTimeMs,
          mastery_before: masteryBefore,
          mastery_after: masteryAfter,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error storing question attempt:', error);
        // Don't throw error - mastery update is more important
        return null;
      }

      console.log('Question attempt stored successfully:', data);
      return data;

    } catch (error) {
      console.error('Error storing question attempt:', error);
      return null;
    }
  }

  /**
   * Ensure question_attempts table exists
   */
  async ensureQuestionAttemptsTable() {
    try {
      // Check if table exists by trying to select from it
      const { error } = await getSupabaseClient()
        .from('question_attempts')
        .select('id')
        .limit(1);

      if (error && error.code === 'PGRST116') {
        // Table doesn't exist, create it
        console.log('Creating question_attempts table...');
        
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS question_attempts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            question_id UUID NOT NULL,
            correct BOOLEAN NOT NULL,
            confidence SMALLINT CHECK (confidence BETWEEN 1 AND 3),
            time_taken_ms INT,
            mastery_before FLOAT,
            mastery_after FLOAT,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_question_attempts_user_id ON question_attempts(user_id);
          CREATE INDEX IF NOT EXISTS idx_question_attempts_question_id ON question_attempts(question_id);
          CREATE INDEX IF NOT EXISTS idx_question_attempts_created_at ON question_attempts(created_at);
        `;

        const { error: createError } = await getSupabaseClient().rpc('exec_sql', { sql: createTableSQL });
        
        if (createError) {
          console.error('Failed to create question_attempts table:', createError);
          // Try alternative approach using raw SQL
          console.log('Table creation failed, but continuing with attempt storage...');
        } else {
          console.log('question_attempts table created successfully');
        }
      }
    } catch (error) {
      console.error('Error ensuring question_attempts table exists:', error);
    }
  }

  /**
   * Convert confidence string to numeric value
   */
  getConfidenceValue(confidence) {
    switch (confidence?.toLowerCase()) {
      case 'low': return 1;
      case 'medium': return 2;
      case 'high': return 3;
      default: return 2;
    }
  }
}

export const objectiveMasteryTableService = new ObjectiveMasteryTableService();
