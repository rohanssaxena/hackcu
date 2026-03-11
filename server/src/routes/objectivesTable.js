import express from 'express';
import { objectiveMasteryTableService } from '../services/objectiveMasteryTable.js';
import { questionObjectiveMappingService } from '../services/questionObjectiveMapping.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// Helper endpoint to create question_attempts table
router.post('/create-table', async (req, res) => {
  try {
    const sqlFile = path.join(__dirname, '../../create_question_attempts.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // This is a simplified approach - in production you'd want proper migrations
    console.log('Creating question_attempts table...');
    
    // For now, just return success and let the storeQuestionAttempt method handle table creation
    res.json({ 
      message: 'Table creation endpoint called. The table will be created automatically when first attempt is stored.',
      sql: sql
    });
    
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get question attempts count
router.get('/attempts/count', async (req, res) => {
  try {
    const { data, error } = await getSupabaseClient()
      .from('question_attempts')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error counting attempts:', error);
      return res.status(500).json({ error: 'Failed to count attempts' });
    }

    res.json({ 
      totalAttempts: data.length,
      message: `Found ${data.length} question attempts`
    });

  } catch (error) {
    console.error('Error in attempts count endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update mastery after a question attempt
router.post('/attempt', async (req, res) => {
  try {
    const { userId, checkpointId, correct, confidence, responseTimeMs } = req.body;
    
    console.log('Received mastery update request:', { userId, checkpointId, correct, confidence, responseTimeMs });

    // Step 1: Find which objective this question belongs to
    const objectiveInfo = await questionObjectiveMappingService.findCheckpointObjective(checkpointId);
    console.log('Found objective info:', objectiveInfo);

    if (!objectiveInfo || objectiveInfo.objectiveId.startsWith('mock-')) {
      console.log('No valid objective found for question:', checkpointId);
      return res.status(404).json({ 
        error: 'No objective found for this question',
        checkpointId 
      });
    }

    // Allow dynamic objectives (they start with 'dynamic-obj-')
    if (objectiveInfo.objectiveId.startsWith('dynamic-obj-')) {
      console.log('Using dynamic objective:', objectiveInfo.objectiveId);
    }

    // Step 2: Get current mastery before update
    const currentMastery = await objectiveMasteryTableService.getObjectiveMastery(objectiveInfo.objectiveId);
    console.log('Current mastery:', currentMastery);

    // Step 3: Update mastery in objectives table
    const masteryResult = await objectiveMasteryTableService.updateObjectiveMastery(
      objectiveInfo.objectiveId, 
      correct, 
      confidence, 
      responseTimeMs
    );
    console.log('Mastery update result:', masteryResult);

    // Step 4: Store the question attempt
    const attemptResult = await objectiveMasteryTableService.storeQuestionAttempt(
      checkpointId,
      userId,
      correct,
      confidence,
      responseTimeMs,
      objectiveInfo.objectiveId,
      currentMastery.level,
      masteryResult.masteryLevel
    );
    console.log('Question attempt stored:', attemptResult);

    // Step 5: Return the complete response
    res.json({
      objectiveId: objectiveInfo.objectiveId,
      masteryLevel: masteryResult.masteryLevel,
      confidenceScore: masteryResult.confidenceScore,
      alpha: masteryResult.alpha,
      beta: masteryResult.beta,
      attempts: masteryResult.attempts,
      checkpointId,
      objective: {
        objectiveId: objectiveInfo.objectiveId,
        objectiveDescription: objectiveInfo.objectiveDescription,
        contentNodeId: objectiveInfo.contentNodeId
      },
      questionAttemptStored: !!attemptResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating mastery:', error);
    res.status(500).json({ 
      error: 'Failed to update mastery',
      details: error.message 
    });
  }
});

/**
 * Get mastery for a specific objective
 * GET /api/objectives/:objectiveId/mastery
 */
router.get('/:objectiveId/mastery', async (req, res) => {
  try {
    const { objectiveId } = req.params;

    const mastery = await objectiveMasteryTableService.getObjectiveMastery(objectiveId);
    res.json(mastery);

  } catch (error) {
    console.error('Error getting objective mastery:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get mastery for all objectives in a content node
 * GET /api/objectives/node/:contentNodeId/mastery
 */
router.get('/node/:contentNodeId/mastery', async (req, res) => {
  try {
    const { contentNodeId } = req.params;

    const mastery = await objectiveMasteryTableService.getNodeObjectivesMastery(contentNodeId);
    res.json(mastery);

  } catch (error) {
    console.error('Error getting node mastery:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get objectives for a content node
 * GET /api/objectives/node/:contentNodeId
 */
router.get('/node/:contentNodeId', async (req, res) => {
  try {
    const { contentNodeId } = req.params;

    const objectives = await questionObjectiveMappingService.getNodeObjectives(contentNodeId);
    res.json(objectives);

  } catch (error) {
    console.error('Error getting node objectives:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get mastery for all objectives in a folder
 * GET /api/objectives/folder/:folderId/mastery
 */
router.get('/folder/:folderId/mastery', async (req, res) => {
  try {
    const { folderId } = req.params;

    const mastery = await objectiveMasteryTableService.getFolderObjectivesMastery(folderId);
    res.json(mastery);

  } catch (error) {
    console.error('Error getting folder mastery:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all objectives for a folder
 * GET /api/objectives/folder/:folderId
 */
router.get('/folder/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;

    const objectives = await questionObjectiveMappingService.getFolderObjectives(folderId);
    res.json(objectives);

  } catch (error) {
    console.error('Error getting folder objectives:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get objectives for a drill
 * GET /api/objectives/drill/:drillId
 */
router.get('/drill/:drillId', async (req, res) => {
  try {
    const { drillId } = req.params;

    const objectives = await questionObjectiveMappingService.getDrillObjectives(drillId);
    res.json(objectives);

  } catch (error) {
    console.error('Error getting drill objectives:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get checkpoint with objective information
 * GET /api/objectives/checkpoint/:checkpointId
 */
router.get('/checkpoint/:checkpointId', async (req, res) => {
  try {
    const { checkpointId } = req.params;

    const checkpoint = await questionObjectiveMappingService.getCheckpointWithObjective(checkpointId);
    res.json(checkpoint);

  } catch (error) {
    console.error('Error getting checkpoint with objective:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get study recommendations based on objective mastery gaps
 * GET /api/objectives/recommendations
 */
router.get('/recommendations', async (req, res) => {
  try {
    const { folderId, limit = 5, includeMastered = false } = req.query;

    if (!folderId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: folderId' 
      });
    }

    // Get all objectives in the folder
    const folderObjectives = await questionObjectiveMappingService.getFolderObjectives(folderId);
    
    // Generate recommendations based on mastery gaps
    const recommendations = [];
    
    Object.values(folderObjectives).forEach(node => {
      node.objectives.forEach(objective => {
        if (!includeMastered && objective.masteryLevel >= 0.8) return;
        
        recommendations.push({
          contentNodeId: node.id,
          nodeTitle: node.title,
          objectiveId: objective.id,
          objectiveDescription: objective.objective,
          masteryLevel: objective.masteryLevel,
          confidence: objective.confidence,
          priority: 1 - objective.masteryLevel, // Lower mastery = higher priority
          reason: objective.masteryLevel < 0.3 ? 'critical' : 'needs_practice',
          lastPracticed: objective.lastPracticed,
          attempts: objective.attempts,
          weight: objective.weight || 5
        });
      });
    });

    // Sort by priority (lowest mastery first) and limit
    recommendations.sort((a, b) => b.priority - a.priority);
    const limitedRecommendations = recommendations.slice(0, parseInt(limit));

    res.json(limitedRecommendations);

  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get mastery statistics for a user
 * GET /api/objectives/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }

    const stats = await objectiveMasteryTableService.getMasteryStats(userId);
    res.json(stats);

  } catch (error) {
    console.error('Error getting mastery stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create objectives from content node data
 * POST /api/objectives/create-from-node
 */
router.post('/create-from-node', async (req, res) => {
  try {
    const { contentNodeId, objectives } = req.body;

    if (!contentNodeId || !objectives || !Array.isArray(objectives)) {
      return res.status(400).json({ 
        error: 'Missing required fields: contentNodeId, objectives (array)' 
      });
    }

    const createdObjectives = await questionObjectiveMappingService.createObjectivesFromContentNode(
      contentNodeId, 
      objectives
    );

    res.json(createdObjectives);

  } catch (error) {
    console.error('Error creating objectives from content node:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update checkpoint to objective mapping
 * PUT /api/objectives/:objectiveId/checkpoints
 */
router.put('/:objectiveId/checkpoints', async (req, res) => {
  try {
    const { objectiveId } = req.params;
    const { checkpointIds } = req.body;

    if (!Array.isArray(checkpointIds)) {
      return res.status(400).json({ 
        error: 'checkpointIds must be an array' 
      });
    }

    const updatedObjective = await questionObjectiveMappingService.updateCheckpointObjectiveMapping(
      objectiveId, 
      checkpointIds
    );

    res.json(updatedObjective);

  } catch (error) {
    console.error('Error updating checkpoint objective mapping:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
