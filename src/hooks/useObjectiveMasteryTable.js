import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for table-based objective mastery tracking
 * Provides functions to record checkpoint attempts and retrieve mastery data
 */
export function useObjectiveMasteryTable(userId) {
  const [objectiveMastery, setObjectiveMastery] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Record a checkpoint attempt and update mastery
  const recordAttempt = useCallback(async (checkpointId, correct, confidence = 'medium', responseTimeMs = 1500) => {
    if (!userId) throw new Error('User ID is required');

    try {
      const response = await fetch('/api/objectives-table/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          checkpointId,
          correct,
          confidence,
          responseTimeMs
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to record attempt: ${response.statusText}`);
      }

      const result = await response.json();

      // Update local state with new mastery data
      setObjectiveMastery(prev => ({
        ...prev,
        [result.objectiveId]: {
          level: result.masteryLevel,
          confidence: result.confidenceScore,
          attempts: result.attempts,
          lastPracticed: result.timestamp,
          alpha: result.alpha,
          beta: result.beta
        }
      }));

      return result;
    } catch (err) {
      console.error('Error recording checkpoint attempt:', err);
      setError(err.message);
      throw err;
    }
  }, [userId]);

  // Get mastery for a specific objective
  const getObjectiveMastery = useCallback(async (objectiveId) => {
    try {
      const response = await fetch(`/api/objectives-table/${objectiveId}/mastery`);
      
      if (!response.ok) {
        throw new Error(`Failed to get objective mastery: ${response.statusText}`);
      }

      const mastery = await response.json();

      // Update local state
      setObjectiveMastery(prev => ({
        ...prev,
        [objectiveId]: mastery
      }));

      return mastery;
    } catch (err) {
      console.error('Error getting objective mastery:', err);
      setError(err.message);
      return {
        level: 0,
        confidence: 0,
        attempts: 0,
        lastPracticed: null
      };
    }
  }, []);

  // Get mastery for all objectives in a content node
  const getNodeObjectivesMastery = useCallback(async (contentNodeId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/objectives-table/node/${contentNodeId}/mastery`);
      
      if (!response.ok) {
        throw new Error(`Failed to get node mastery: ${response.statusText}`);
      }

      const mastery = await response.json();

      // Update local state
      setObjectiveMastery(prev => ({
        ...prev,
        ...mastery
      }));

      return mastery;
    } catch (err) {
      console.error('Error getting node mastery:', err);
      setError(err.message);
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  // Get mastery for all objectives in a folder
  const getFolderObjectivesMastery = useCallback(async (folderId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/objectives-table/folder/${folderId}/mastery`);
      
      if (!response.ok) {
        throw new Error(`Failed to get folder mastery: ${response.statusText}`);
      }

      const mastery = await response.json();

      // Flatten all objectives into local state
      const flattenedMastery = {};
      Object.values(mastery).forEach(node => {
        Object.entries(node.objectives).forEach(([objectiveId, objMastery]) => {
          flattenedMastery[objectiveId] = objMastery;
        });
      });

      setObjectiveMastery(flattenedMastery);
      return mastery;
    } catch (err) {
      console.error('Error getting folder mastery:', err);
      setError(err.message);
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  // Get objectives for a drill
  const getDrillObjectives = useCallback(async (drillId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/objectives-table/drill/${drillId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get drill objectives: ${response.statusText}`);
      }

      const objectives = await response.json();

      // Update local state with current mastery
      const masteryUpdates = {};
      objectives.forEach(obj => {
        masteryUpdates[obj.id] = {
          level: obj.masteryLevel,
          confidence: obj.confidence,
          attempts: obj.attempts,
          lastPracticed: obj.lastPracticed
        };
      });

      setObjectiveMastery(prev => ({
        ...prev,
        ...masteryUpdates
      }));

      return objectives;
    } catch (err) {
      console.error('Error getting drill objectives:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get mastery for a specific objective from local state
  const getLocalObjectiveMastery = useCallback((objectiveId) => {
    return objectiveMastery[objectiveId] || {
      level: 0,
      confidence: 0,
      attempts: 0,
      lastPracticed: null
    };
  }, [objectiveMastery]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    objectiveMastery,
    loading,
    error,
    recordAttempt,
    getObjectiveMastery,
    getNodeObjectivesMastery,
    getFolderObjectivesMastery,
    getDrillObjectives,
    getLocalObjectiveMastery,
    clearError
  };
}

/**
 * Hook for folder-level objectives and mastery
 */
export function useFolderObjectives(userId, folderId) {
  const [objectives, setObjectives] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadFolderObjectives = useCallback(async () => {
    if (!folderId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/objectives-table/folder/${folderId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load folder objectives');
      }

      setObjectives(data);
    } catch (err) {
      console.error('Error loading folder objectives:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    loadFolderObjectives();
  }, [loadFolderObjectives]);

  return {
    objectives,
    loading,
    error,
    loadFolderObjectives
  };
}

/**
 * Hook for drill objectives and real-time updates
 */
export function useDrillObjectives(userId, drillId) {
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { recordAttempt } = useObjectiveMasteryTable(userId);

  const loadDrillObjectives = useCallback(async () => {
    if (!drillId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/objectives-table/drill/${drillId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load drill objectives');
      }

      setObjectives(data);
    } catch (err) {
      console.error('Error loading drill objectives:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [drillId]);

  // Handle question answer with real-time objective update
  const handleQuestionAnswer = useCallback(async (checkpointId, correct, confidence, responseTime) => {
    try {
      const result = await recordAttempt(checkpointId, correct, confidence, responseTime);

      // Update the specific objective in local state
      setObjectives(prev => prev.map(obj => 
        obj.id === result.objectiveId 
          ? { 
              ...obj, 
              masteryLevel: result.masteryLevel,
              confidence: result.confidenceScore,
              attempts: result.attempts,
              lastPracticed: result.timestamp
            }
          : obj
      ));

      return result;
    } catch (err) {
      console.error('Error handling question answer:', err);
      throw err;
    }
  }, [recordAttempt]);

  useEffect(() => {
    loadDrillObjectives();
  }, [loadDrillObjectives]);

  return {
    objectives,
    loading,
    error,
    loadDrillObjectives,
    handleQuestionAnswer
  };
}

/**
 * Utility functions for mastery display
 */
export const masteryUtils = {
  // Get mastery level color based on percentage
  getMasteryColor: (level) => {
    if (level >= 0.8) return '#05df72'; // accent-green
    if (level >= 0.6) return '#2b7fff'; // accent-blue
    if (level >= 0.4) return '#ffa500'; // orange
    return '#ff4444'; // red
  },

  // Get mastery level text
  getMasteryText: (level) => {
    if (level >= 0.8) return 'Mastered';
    if (level >= 0.6) return 'Proficient';
    if (level >= 0.4) return 'Developing';
    return 'Struggling';
  },

  // Format mastery percentage for display
  formatMastery: (level) => {
    return `${Math.round(level * 100)}%`;
  },

  // Get priority color for recommendations
  getPriorityColor: (priority) => {
    if (priority >= 0.7) return '#ff4444'; // High priority - red
    if (priority >= 0.4) return '#ffa500'; // Medium priority - orange
    return '#2b7fff'; // Low priority - blue
  },

  // Check if objective needs practice
  needsPractice: (mastery) => {
    return mastery.level < 0.6;
  },

  // Check if objective is critical
  isCritical: (mastery) => {
    return mastery.level < 0.3;
  },

  // Format time ago
  formatTimeAgo: (timestamp) => {
    if (!timestamp) return 'Never';
    
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  }
};
