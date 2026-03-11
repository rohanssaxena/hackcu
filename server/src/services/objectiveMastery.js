import { createClient } from '@supabase/supabase-js';

let supabase = null;

function getSupabaseClient() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
}

/**
 * Objective Mastery Tracking Service
 * Implements Bayesian knowledge tracking at the objective level within content nodes
 */
export class ObjectiveMasteryTracker {
  /**
   * Update mastery for a specific objective after a question attempt
   */
  async updateObjectiveMastery(userId, contentNodeId, objectiveId, correct, confidence = 'medium', responseTimeMs = 1500) {
    try {
      // Get current content node with mastery data
      const { data: node, error: nodeError } = await getSupabaseClient()
        .from('content_nodes')
        .select('mastery')
        .eq('id', contentNodeId)
        .single();

      if (nodeError) throw nodeError;

      // Initialize mastery data if not exists
      const currentMastery = node.mastery || {};
      const objectiveMastery = currentMastery[objectiveId] || {
        alpha: 1.0,
        beta: 1.0,
        last_practiced: null,
        confidence_history: [],
        response_times: [],
        attempts: 0
      };

      // Calculate weight based on confidence and response time
      const confidenceWeight = this.getConfidenceWeight(confidence);
      const speedWeight = this.getSpeedWeight(responseTimeMs);
      const weight = confidenceWeight * speedWeight;

      // Update Bayesian parameters
      const newAlpha = correct ? objectiveMastery.alpha + weight : objectiveMastery.alpha;
      const newBeta = correct ? objectiveMastery.beta : objectiveMastery.beta + weight;

      // Update mastery data
      const updatedMastery = {
        ...objectiveMastery,
        alpha: newAlpha,
        beta: newBeta,
        last_practiced: new Date().toISOString(),
        confidence_history: [...objectiveMastery.confidence_history, this.confidenceToNumber(confidence)].slice(-10), // Keep last 10
        response_times: [...objectiveMastery.response_times, responseTimeMs].slice(-10), // Keep last 10
        attempts: objectiveMastery.attempts + 1
      };

      // Update content node mastery
      const newMastery = {
        ...currentMastery,
        [objectiveId]: updatedMastery
      };

      const { error: updateError } = await getSupabaseClient()
        .from('content_nodes')
        .update({ mastery: newMastery })
        .eq('id', contentNodeId);

      if (updateError) throw updateError;

      // Return mastery estimate and confidence
      const masteryLevel = newAlpha / (newAlpha + newBeta);
      const confidenceScore = this.calculateConfidence(updatedMastery);

      return {
        objectiveId,
        masteryLevel,
        confidenceScore,
        alpha: newAlpha,
        beta: newBeta,
        attempts: updatedMastery.attempts
      };

    } catch (error) {
      console.error('Error updating objective mastery:', error);
      throw error;
    }
  }

  /**
   * Get mastery for all objectives in a content node
   */
  async getNodeMastery(userId, contentNodeId) {
    try {
      const { data: node, error } = await getSupabaseClient()
        .from('content_nodes')
        .select('mastery')
        .eq('id', contentNodeId)
        .single();

      if (error) throw error;

      const mastery = {};
      const nodeMastery = node.mastery || {};

      Object.keys(nodeMastery).forEach(objectiveId => {
        const objMastery = nodeMastery[objectiveId];
        mastery[objectiveId] = {
          level: objMastery.alpha / (objMastery.alpha + objMastery.beta),
          confidence: this.calculateConfidence(objMastery),
          lastPracticed: objMastery.last_practiced,
          attempts: objMastery.attempts,
          alpha: objMastery.alpha,
          beta: objMastery.beta
        };
      });

      return mastery;

    } catch (error) {
      console.error('Error getting node mastery:', error);
      return {};
    }
  }

  /**
   * Get mastery for all content nodes in a folder
   */
  async getFolderMastery(userId, folderId) {
    try {
      const { data: nodes, error } = await getSupabaseClient()
        .from('content_nodes')
        .select('id, title, mastery')
        .eq('folder_id', folderId);

      if (error) throw error;

      const folderMastery = {};
      
      nodes.forEach(node => {
        const nodeMastery = {};
        const masteryData = node.mastery || {};

        Object.keys(masteryData).forEach(objectiveId => {
          const objMastery = masteryData[objectiveId];
          nodeMastery[objectiveId] = {
            level: objMastery.alpha / (objMastery.alpha + objMastery.beta),
            confidence: this.calculateConfidence(objMastery),
            lastPracticed: objMastery.last_practiced,
            attempts: objMastery.attempts
          };
        });

        folderMastery[node.id] = {
          title: node.title,
          objectives: nodeMastery
        };
      });

      return folderMastery;

    } catch (error) {
      console.error('Error getting folder mastery:', error);
      return {};
    }
  }

  /**
   * Find which content node and objective a checkpoint belongs to
   */
  async findCheckpointContext(checkpointId) {
    try {
      const { data, error } = await getSupabaseClient()
        .from('checkpoints')
        .select(`
          phase_id,
          phases!inner(
            content_node_id,
            content_nodes!inner(
              id,
              objectives!inner(
                id,
                objective,
                checkpoints
              )
            )
          )
        `)
        .eq('id', checkpointId)
        .single();

      if (error) throw error;

      // Find which objective contains this checkpoint
      const objectives = data.phases.content_nodes.objectives;
      let targetObjective = null;

      for (const objective of objectives) {
        if (objective.checkpoints && objective.checkpoints.includes(checkpointId)) {
          targetObjective = objective;
          break;
        }
      }

      if (!targetObjective) {
        throw new Error('Checkpoint not found in any objective');
      }

      return {
        contentNodeId: data.phases.content_nodes.id,
        objectiveId: targetObjective.id,
        objectiveDescription: targetObjective.objective
      };

    } catch (error) {
      console.error('Error finding checkpoint context:', error);
      throw error;
    }
  }

  /**
   * Calculate confidence weight based on user-reported confidence
   */
  getConfidenceWeight(confidence) {
    const weights = {
      high: 1.15,
      medium: 1.0,
      low: 0.8
    };
    return weights[confidence] || 1.0;
  }

  /**
   * Calculate speed weight based on response time
   */
  getSpeedWeight(responseTimeMs, avgTimeMs = 1500) {
    if (avgTimeMs <= 0) return 1.0;
    
    const ratio = responseTimeMs / avgTimeMs;
    if (ratio <= 0.7) return 1.1;  // Fast answer
    if (ratio >= 1.5) return 0.9;  // Slow answer
    return 1.0;  // Normal speed
  }

  /**
   * Convert confidence string to number for storage
   */
  confidenceToNumber(confidence) {
    const numbers = {
      high: 0.9,
      medium: 0.7,
      low: 0.5
    };
    return numbers[confidence] || 0.7;
  }

  /**
   * Calculate confidence score based on alpha/beta parameters
   */
  calculateConfidence(masteryData) {
    const { alpha, beta, attempts } = masteryData;
    
    // Higher confidence with more attempts and balanced alpha/beta
    const totalEvidence = alpha + beta;
    const balance = Math.min(alpha, beta) / Math.max(alpha, beta);
    const evidenceFactor = Math.min(totalEvidence / 10, 1); // Cap at 10 attempts
    
    return balance * evidenceFactor;
  }

  /**
   * Get lower credible bound for conservative mastery estimate
   */
  getLowerCredibleBound(masteryData, q = 0.1) {
    const { alpha, beta } = masteryData;
    
    // Simple approximation for lower bound
    const mean = alpha / (alpha + beta);
    const variance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));
    const stdDev = Math.sqrt(variance);
    
    // Use normal approximation for lower bound
    return Math.max(0.01, mean - 1.28 * stdDev); // 10th percentile
  }
}

export const objectiveMasteryTracker = new ObjectiveMasteryTracker();
