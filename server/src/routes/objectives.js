import express from 'express';
import { objectiveMasteryTracker } from '../services/objectiveMastery.js';
import { studyRecommendationEngine } from '../services/studyRecommendations.js';

const router = express.Router();

/**
 * Record a checkpoint attempt and update objective mastery
 * POST /api/objectives/attempt
 */
router.post('/attempt', async (req, res) => {
  try {
    const { 
      userId, 
      checkpointId, 
      correct, 
      confidence = 'medium', 
      responseTimeMs = 1500 
    } = req.body;

    if (!userId || !checkpointId || typeof correct !== 'boolean') {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, checkpointId, correct' 
      });
    }

    // Find which content node and objective this checkpoint belongs to
    const context = await objectiveMasteryTracker.findCheckpointContext(checkpointId);
    
    // Update the objective mastery
    const result = await objectiveMasteryTracker.updateObjectiveMastery(
      userId,
      context.contentNodeId,
      context.objectiveId,
      correct,
      confidence,
      responseTimeMs
    );

    res.json({
      ...result,
      context: {
        contentNodeId: context.contentNodeId,
        objectiveId: context.objectiveId,
        objectiveDescription: context.objectiveDescription
      }
    });

  } catch (error) {
    console.error('Error recording checkpoint attempt:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get mastery for all objectives in a content node
 * GET /api/objectives/node/:nodeId/mastery
 */
router.get('/node/:nodeId/mastery', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }

    const mastery = await objectiveMasteryTracker.getNodeMastery(userId, nodeId);
    res.json(mastery);

  } catch (error) {
    console.error('Error getting node mastery:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get mastery for all content nodes in a folder
 * GET /api/objectives/folder/:folderId/mastery
 */
router.get('/folder/:folderId/mastery', async (req, res) => {
  try {
    const { folderId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }

    const mastery = await objectiveMasteryTracker.getFolderMastery(userId, folderId);
    res.json(mastery);

  } catch (error) {
    console.error('Error getting folder mastery:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get study recommendations based on objective mastery gaps
 * GET /api/objectives/recommendations
 */
router.get('/recommendations', async (req, res) => {
  try {
    const { userId, folderId, limit = 5, prioritizeBy = 'mastery_gap' } = req.query;

    if (!userId || !folderId) {
      return res.status(400).json({ 
        error: 'Missing required parameters: userId, folderId' 
      });
    }

    const recommendations = await studyRecommendationEngine.generateRecommendations(
      userId,
      folderId,
      {
        limit: parseInt(limit),
        prioritizeBy,
        includeMastered: false
      }
    );

    res.json(recommendations);

  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate personalized study plan
 * GET /api/objectives/study-plan
 */
router.get('/study-plan', async (req, res) => {
  try {
    const { userId, folderId, sessionDurationMinutes = 45 } = req.query;

    if (!userId || !folderId) {
      return res.status(400).json({ 
        error: 'Missing required parameters: userId, folderId' 
      });
    }

    const studyPlan = await studyRecommendationEngine.generateStudyPlan(
      userId,
      folderId,
      parseInt(sessionDurationMinutes)
    );

    res.json(studyPlan);

  } catch (error) {
    console.error('Error generating study plan:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get mastery statistics for a user across all folders
 * GET /api/objectives/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }

    // This would require joining across folders - for now return basic structure
    // In a full implementation, you'd aggregate across all user's folders
    res.json({
      totalObjectives: 0,
      averageMastery: 0,
      masteredObjectives: 0,
      strugglingObjectives: 0,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting mastery stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
