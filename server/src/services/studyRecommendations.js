import { objectiveMasteryTracker } from '../services/objectiveMastery.js';

let supabase = null;

function getSupabaseClient() {
  if (!supabase) {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
}

/**
 * Study Recommendation Engine
 * Generates personalized study recommendations based on objective mastery gaps
 */
export class StudyRecommendationEngine {
  /**
   * Generate comprehensive study recommendations for a user
   */
  async generateRecommendations(userId, folderId, options = {}) {
    const {
      limit = 10,
      includeMastered = false,
      prioritizeBy = 'mastery_gap', // 'mastery_gap', 'recent_practice', 'difficulty'
      difficulty = null // filter by difficulty level
    } = options;

    try {
      // Get all content nodes and objectives for the folder
      const { data: nodes, error: nodesError } = await getSupabaseClient()
        .from('content_nodes')
        .select(`
          id,
          title,
          objectives!inner(
            id,
            objective,
            weight,
            checkpoints
          ),
          phases!inner(
            id,
            title,
            checkpoints!inner(
              id,
              question,
              difficulty
            )
          )
        `)
        .eq('folder_id', folderId);

      if (nodesError) throw nodesError;

      // Get mastery data for all nodes
      const folderMastery = await objectiveMasteryTracker.getFolderMastery(userId, folderId);

      // Generate recommendations for each objective
      const recommendations = [];

      for (const node of nodes) {
        for (const objective of node.objectives) {
          const mastery = folderMastery[node.id]?.objectives[objective.id];
          const masteryLevel = mastery?.level || 0;
          
          // Skip if mastered and not including mastered items
          if (!includeMastered && masteryLevel >= 0.8) continue;

          // Calculate recommendation priority and details
          const recommendation = await this.buildRecommendation(
            userId,
            node,
            objective,
            mastery,
            masteryLevel
          );

          if (recommendation) {
            recommendations.push(recommendation);
          }
        }
      }

      // Sort and filter recommendations
      const sortedRecommendations = this.sortRecommendations(
        recommendations,
        prioritizeBy
      );

      return sortedRecommendations.slice(0, limit);

    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Build a single recommendation for an objective
   */
  async buildRecommendation(userId, node, objective, mastery, masteryLevel) {
    const now = new Date();
    const lastPracticed = mastery?.lastPracticed ? new Date(mastery.lastPracticed) : null;
    const daysSincePractice = lastPracticed ? (now - lastPracticed) / (1000 * 60 * 60 * 24) : Infinity;

    // Determine recommendation type and priority
    let recommendationType, reason, urgency;

    if (masteryLevel < 0.3) {
      recommendationType = 'critical_review';
      reason = 'Critical knowledge gap detected';
      urgency = 'high';
    } else if (masteryLevel < 0.6) {
      recommendationType = 'practice_needed';
      reason = 'Needs more practice to achieve proficiency';
      urgency = 'medium';
    } else if (daysSincePractice > 7) {
      recommendationType = 'spaced_review';
      reason = 'Due for review to prevent forgetting';
      urgency = 'low';
    } else if (!includeMastered && masteryLevel >= 0.8) {
      return null; // Skip mastered objectives
    } else {
      recommendationType = 'maintenance';
      reason = 'Maintain mastery through occasional review';
      urgency = 'low';
    }

    // Calculate priority score
    const priorityScore = this.calculatePriorityScore(
      masteryLevel,
      daysSincePractice,
      objective.weight || 5,
      mastery?.attempts || 0
    );

    // Get available checkpoints for this objective
    const availableCheckpoints = await this.getAvailableCheckpoints(objective);

    return {
      id: `${node.id}-${objective.id}`,
      type: recommendationType,
      priority: priorityScore,
      urgency,
      reason,
      
      // Content information
      contentNodeId: node.id,
      nodeTitle: node.title,
      objectiveId: objective.id,
      objectiveDescription: objective.objective,
      objectiveWeight: objective.weight || 5,
      
      // Mastery information
      currentMastery: masteryLevel,
      mastery: mastery || {
        level: 0,
        confidence: 0,
        attempts: 0,
        lastPracticed: null
      },
      
      // Practice information
      availableCheckpoints,
      recommendedPracticeTime: this.estimatePracticeTime(masteryLevel, availableCheckpoints.length),
      daysSincePractice,
      
      // Metadata
      generatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };
  }

  /**
   * Calculate priority score for recommendations
   */
  calculatePriorityScore(masteryLevel, daysSincePractice, weight, attempts) {
    // Lower mastery = higher priority
    const masteryScore = 1 - masteryLevel;
    
    // More days since practice = higher priority (but capped)
    const practiceScore = Math.min(daysSincePractice / 14, 1); // Cap at 14 days
    
    // Higher weight = higher priority
    const weightScore = weight / 10;
    
    // Fewer attempts = higher priority (for struggling objectives)
    const attemptScore = attempts === 0 ? 1 : Math.max(0, 1 - attempts / 10);
    
    // Combine scores with weights
    const priority = (
      masteryScore * 0.5 +      // 50% weight on mastery gap
      practiceScore * 0.2 +     // 20% weight on recency
      weightScore * 0.2 +       // 20% weight on objective importance
      attemptScore * 0.1         // 10% weight on attempt history
    );
    
    return Math.min(priority, 1); // Cap at 1.0
  }

  /**
   * Get available checkpoints for an objective
   */
  async getAvailableCheckpoints(objective) {
    try {
      if (!objective.checkpoints || objective.checkpoints.length === 0) {
        return [];
      }

      const { data: checkpoints, error } = await getSupabaseClient()
        .from('checkpoints')
        .select('id, question, difficulty, options!inner(text, correct, explanation)')
        .in('id', objective.checkpoints);

      if (error) throw error;

      return checkpoints.map(cp => ({
        id: cp.id,
        question: cp.question,
        difficulty: cp.difficulty,
        options: cp.options
      }));

    } catch (error) {
      console.error('Error getting checkpoints:', error);
      return [];
    }
  }

  /**
   * Estimate practice time needed
   */
  estimatePracticeTime(masteryLevel, checkpointCount) {
    const baseTimePerCheckpoint = 2; // 2 minutes per checkpoint
    const masteryMultiplier = masteryLevel < 0.3 ? 2 : masteryLevel < 0.6 ? 1.5 : 1;
    
    return Math.round(checkpointCount * baseTimePerCheckpoint * masteryMultiplier);
  }

  /**
   * Sort recommendations by different criteria
   */
  sortRecommendations(recommendations, sortBy) {
    const sorted = [...recommendations];

    switch (sortBy) {
      case 'mastery_gap':
        return sorted.sort((a, b) => b.currentMastery - a.currentMastery);
      
      case 'recent_practice':
        return sorted.sort((a, b) => (a.daysSincePractice || Infinity) - (b.daysSincePractice || Infinity));
      
      case 'difficulty':
        return sorted.sort((a, b) => (b.objectiveWeight || 5) - (a.objectiveWeight || 5));
      
      case 'priority':
      default:
        return sorted.sort((a, b) => b.priority - a.priority);
    }
  }

  /**
   * Group recommendations by type
   */
  groupRecommendations(recommendations) {
    return recommendations.reduce((groups, rec) => {
      if (!groups[rec.type]) {
        groups[rec.type] = [];
      }
      groups[rec.type].push(rec);
      return groups;
    }, {});
  }

  /**
   * Get personalized study session plan
   */
  async generateStudyPlan(userId, folderId, sessionDurationMinutes = 45) {
    try {
      // Get recommendations
      const recommendations = await this.generateRecommendations(
        userId,
        folderId,
        { limit: 20 }
      );

      // Build study plan
      const studyPlan = {
        duration: sessionDurationMinutes,
        objectives: [],
        totalTime: 0,
        estimatedMasteryGain: 0
      };

      let remainingTime = sessionDurationMinutes;

      // Add highest priority recommendations first
      for (const rec of recommendations) {
        if (remainingTime <= 0) break;

        const practiceTime = Math.min(rec.recommendedPracticeTime, remainingTime);
        
        studyPlan.objectives.push({
          ...rec,
          allocatedTime: practiceTime,
          checkpointsToComplete: Math.ceil(practiceTime / 2) // 2 minutes per checkpoint
        });

        studyPlan.totalTime += practiceTime;
        studyPlan.estimatedMasteryGain += (1 - rec.currentMastery) * (practiceTime / rec.recommendedPracticeTime) * 0.1;
        
        remainingTime -= practiceTime;
      }

      return studyPlan;

    } catch (error) {
      console.error('Error generating study plan:', error);
      throw error;
    }
  }
}

export const studyRecommendationEngine = new StudyRecommendationEngine();
