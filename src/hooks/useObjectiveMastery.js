import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook for objective-level mastery tracking
 * Provides functions to record checkpoint attempts and retrieve mastery data
 */
export function useObjectiveMastery(userId, contentNodeId) {
  const [objectiveMastery, setObjectiveMastery] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load mastery data for a specific content node
  const loadMastery = useCallback(async () => {
    if (!userId || !contentNodeId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('get-objective-mastery', {
        body: { userId, contentNodeId }
      });

      if (error) throw error;

      setObjectiveMastery(data || {});
    } catch (err) {
      console.error('Error loading objective mastery:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, contentNodeId]);

  // Record a checkpoint attempt and update mastery
  const recordAttempt = useCallback(async (checkpointId, correct, confidence = 'medium', responseTimeMs = 1500) => {
    if (!userId) throw new Error('User ID is required');

    try {
      const { data, error } = await supabase.functions.invoke('record-checkpoint-attempt', {
        body: {
          userId,
          checkpointId,
          correct,
          confidence,
          responseTimeMs
        }
      });

      if (error) throw error;

      // Update local state with new mastery data
      if (data.objectiveId) {
        setObjectiveMastery(prev => ({
          ...prev,
          [data.objectiveId]: {
            level: data.masteryLevel,
            confidence: data.confidenceScore,
            attempts: data.attempts,
            lastPracticed: new Date().toISOString()
          }
        }));
      }

      return data;
    } catch (err) {
      console.error('Error recording checkpoint attempt:', err);
      throw err;
    }
  }, [userId]);

  // Get mastery for a specific objective
  const getObjectiveMastery = useCallback((objectiveId) => {
    return objectiveMastery[objectiveId] || {
      level: 0,
      confidence: 0,
      attempts: 0,
      lastPracticed: null
    };
  }, [objectiveMastery]);

  // Initialize mastery data on mount
  useEffect(() => {
    loadMastery();
  }, [loadMastery]);

  return {
    objectiveMastery,
    loading,
    error,
    recordAttempt,
    getObjectiveMastery,
    loadMastery
  };
}

/**
 * Hook for folder-level mastery tracking
 * Provides mastery data across all content nodes in a folder
 */
export function useFolderMastery(userId, folderId) {
  const [folderMastery, setFolderMastery] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadFolderMastery = useCallback(async () => {
    if (!userId || !folderId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/objectives/folder/${folderId}/mastery?userId=${userId}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to load folder mastery');

      setFolderMastery(data);
    } catch (err) {
      console.error('Error loading folder mastery:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, folderId]);

  useEffect(() => {
    loadFolderMastery();
  }, [loadFolderMastery]);

  return {
    folderMastery,
    loading,
    error,
    loadFolderMastery
  };
}

/**
 * Hook for study recommendations based on objective mastery
 */
export function useStudyRecommendations(userId, folderId, limit = 5) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRecommendations = useCallback(async () => {
    if (!userId || !folderId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/objectives/recommendations?userId=${userId}&folderId=${folderId}&limit=${limit}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to load recommendations');

      setRecommendations(data);
    } catch (err) {
      console.error('Error loading recommendations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, folderId, limit]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  return {
    recommendations,
    loading,
    error,
    loadRecommendations
  };
}

/**
 * Utility functions for mastery calculations
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
  }
};
