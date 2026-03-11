import React from 'react';
import { masteryUtils } from '../hooks/useObjectiveMastery';

/**
 * Component to display mastery level for an objective
 * Shows a progress bar with color coding and percentage
 */
export function ObjectiveMasteryBar({ mastery, showLabel = true, size = 'medium' }) {
  const masteryLevel = mastery?.level || 0;
  const color = masteryUtils.getMasteryColor(masteryLevel);
  const text = masteryUtils.getMasteryText(masteryLevel);
  const percentage = masteryUtils.formatMastery(masteryLevel);

  const sizeClasses = {
    small: 'h-2',
    medium: 'h-3',
    large: 'h-4'
  };

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className="text-xs text-text-secondary min-w-[60px]">
          {percentage}
        </span>
      )}
      <div className={`flex-1 bg-bg-sidebar rounded-full ${sizeClasses[size]}`}>
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${masteryLevel * 100}%`,
            backgroundColor: color,
            minWidth: masteryLevel > 0 ? '2px' : '0'
          }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-text-secondary min-w-[80px]">
          {text}
        </span>
      )}
    </div>
  );
}

/**
 * Component to display mastery for all objectives in a content node
 */
export function ObjectiveMasteryList({ objectives, objectiveMastery, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-bg-sidebar rounded mb-2" />
            <div className="h-2 bg-bg-sidebar rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!objectives || objectives.length === 0) {
    return (
      <div className="text-text-secondary text-sm">
        No objectives available for this content.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {objectives.map((objective) => {
        const mastery = objectiveMastery[objective.id] || {
          level: 0,
          confidence: 0,
          attempts: 0,
          lastPracticed: null
        };

        return (
          <div key={objective.id} className="space-y-2">
            <div className="flex justify-between items-start">
              <h4 className="text-sm font-medium text-text-primary flex-1">
                {objective.objective}
              </h4>
              <div className="text-xs text-text-secondary ml-2">
                {mastery.attempts} attempts
              </div>
            </div>
            
            <ObjectiveMasteryBar 
              mastery={mastery} 
              size="small"
              showLabel={true}
            />

            {mastery.lastPracticed && (
              <div className="text-xs text-text-secondary">
                Last practiced: {new Date(mastery.lastPracticed).toLocaleDateString()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Component to display a compact mastery indicator for a content node
 * Shows overall mastery summary
 */
export function ContentNodeMasterySummary({ objectives, objectiveMastery, size = 'small' }) {
  if (!objectives || objectives.length === 0) {
    return null;
  }

  const masteryLevels = objectives.map(obj => {
    const mastery = objectiveMastery[obj.id] || { level: 0 };
    return mastery.level;
  });

  const averageMastery = masteryLevels.reduce((a, b) => a + b, 0) / masteryLevels.length;
  const masteredCount = masteryLevels.filter(level => level >= 0.8).length;
  const totalCount = objectives.length;

  const sizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  return (
    <div className={`flex items-center gap-2 ${sizeClasses[size]}`}>
      <ObjectiveMasteryBar 
        mastery={{ level: averageMastery }} 
        size="small"
        showLabel={false}
      />
      <span className="text-text-secondary">
        {masteredCount}/{totalCount} mastered
      </span>
    </div>
  );
}

/**
 * Component for study recommendations based on mastery gaps
 */
export function StudyRecommendations({ recommendations, loading, onRecommendationClick }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-3 bg-bg-sidebar rounded mb-1" />
            <div className="h-2 bg-bg-sidebar rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="text-text-secondary text-sm">
        Great job! You're mastering all your objectives.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recommendations.map((rec, index) => (
        <div
          key={`${rec.contentNodeId}-${rec.objectiveId}`}
          className="p-3 bg-bg-sidebar rounded-lg border border-border hover:border-accent-blue cursor-pointer transition-colors"
          onClick={() => onRecommendationClick && onRecommendationClick(rec)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: masteryUtils.getPriorityColor(rec.priority) }}
                />
                <span className="text-sm font-medium text-text-primary">
                  {rec.nodeTitle}
                </span>
              </div>
              
              <div className="text-sm text-text-secondary mb-2">
                {rec.objectiveId.replace('obj_', 'Objective ')}: {masteryUtils.formatMastery(rec.masteryLevel)}
              </div>
              
              <div className="flex items-center gap-4 text-xs text-text-secondary">
                <span className="capitalize">
                  {rec.reason === 'critical' ? '🔴 Critical' : '🟡 Needs Practice'}
                </span>
                {rec.attempts > 0 && (
                  <span>{rec.attempts} attempts</span>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-text-secondary">Priority</div>
              <div className="text-sm font-medium" style={{ color: masteryUtils.getPriorityColor(rec.priority) }}>
                {Math.round(rec.priority * 100)}%
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Component to display mastery statistics
 */
export function MasteryStats({ folderMastery, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-8 bg-bg-sidebar rounded mb-1" />
            <div className="h-4 bg-bg-sidebar rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  // Calculate stats from folder mastery data
  let totalObjectives = 0;
  let totalMastery = 0;
  let masteredObjectives = 0;
  let strugglingObjectives = 0;

  Object.values(folderMastery).forEach(node => {
    Object.values(node.objectives).forEach(mastery => {
      totalObjectives++;
      totalMastery += mastery.level;
      
      if (mastery.level >= 0.8) masteredObjectives++;
      if (mastery.level < 0.4) strugglingObjectives++;
    });
  });

  const averageMastery = totalObjectives > 0 ? totalMastery / totalObjectives : 0;

  const stats = [
    {
      label: 'Total Objectives',
      value: totalObjectives,
      color: 'text-text-primary'
    },
    {
      label: 'Average Mastery',
      value: masteryUtils.formatMastery(averageMastery),
      color: masteryUtils.getMasteryColor(averageMastery)
    },
    {
      label: 'Mastered',
      value: masteredObjectives,
      color: '#05df72'
    },
    {
      label: 'Struggling',
      value: strugglingObjectives,
      color: '#ff4444'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="text-center">
          <div className={`text-2xl font-bold ${stat.color}`}>
            {stat.value}
          </div>
          <div className="text-xs text-text-secondary">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
