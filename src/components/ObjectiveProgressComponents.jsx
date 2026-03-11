import React from 'react';
import { masteryUtils } from '../hooks/useObjectiveMasteryTable';
import { Target, TrendingUp, Clock, Award, AlertTriangle } from 'lucide-react';

/**
 * Objective progress bar component
 * Shows mastery level with color coding and animations
 */
export function ObjectiveProgressBar({ mastery, showLabel = true, size = 'medium', animated = true }) {
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
        <span className="text-xs text-text-secondary min-w-[45px] font-medium">
          {percentage}
        </span>
      )}
      <div className={`flex-1 bg-bg-sidebar rounded-full ${sizeClasses[size]} relative overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all ${animated ? 'duration-500 ease-out' : 'duration-0'}`}
          style={{
            width: `${masteryLevel * 100}%`,
            backgroundColor: color,
            minWidth: masteryLevel > 0 ? '2px' : '0'
          }}
        />
        {animated && masteryLevel > 0 && (
          <div 
            className="absolute top-0 left-0 h-full rounded-full opacity-30 animate-pulse"
            style={{
              width: `${masteryLevel * 100}%`,
              backgroundColor: color
            }}
          />
        )}
      </div>
      {showLabel && (
        <span className="text-xs text-text-secondary min-w-[70px]">
          {text}
        </span>
      )}
    </div>
  );
}

/**
 * Objective card component for displaying objective with progress
 */
export function ObjectiveCard({ objective, isActive = false, showDetails = false, size = 'medium' }) {
  const masteryLevel = objective?.masteryLevel || 0;
  const confidence = objective?.confidence || 0;
  const attempts = objective?.attempts || 0;
  const lastPracticed = objective?.lastPracticed;

  return (
    <div className={`p-4 bg-bg-primary rounded-lg border transition-all ${
      isActive ? 'border-accent-blue bg-accent-blue/5 shadow-sm' : 'border-border'
    } ${size === 'small' ? 'p-3' : 'p-4'}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className={`font-medium text-text-primary line-clamp-2 ${
            size === 'small' ? 'text-sm' : 'text-base'
          }`}>
            {objective?.objective || 'Unknown Objective'}
          </h4>
          {isActive && (
            <div className="flex items-center gap-1 mt-1 text-xs text-accent-blue">
              <TrendingUp className="w-3 h-3" />
              <span>Recently Updated</span>
            </div>
          )}
        </div>
        {showDetails && (
          <div className="text-right ml-2">
            <div className="text-xs text-text-secondary">
              {attempts} attempts
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <ObjectiveProgressBar 
          mastery={{ level: masteryLevel }} 
          size="small"
          animated={isActive}
        />
      </div>

      {/* Additional details */}
      {showDetails && (
        <div className="flex justify-between items-center text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getConfidenceColor(confidence) }} />
              <span>Confidence: {Math.round(confidence * 100)}%</span>
            </div>
            {lastPracticed && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{masteryUtils.formatTimeAgo(lastPracticed)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Objectives list component
 * Displays a list of objectives with their progress
 */
export function ObjectivesList({ objectives, loading, showDetails = false, size = 'medium' }) {
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
      <div className="text-center py-8">
        <Target className="w-12 h-12 text-text-secondary mx-auto mb-3" />
        <p className="text-text-secondary text-sm">
          No objectives available
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${size === 'small' ? 'space-y-2' : 'space-y-3'}`}>
      {objectives.map((objective) => (
        <ObjectiveCard
          key={objective.id}
          objective={objective}
          isActive={objective.isActive}
          showDetails={showDetails}
          size={size}
        />
      ))}
    </div>
  );
}

/**
 * Objectives sidebar component for drills
 * Shows all objectives with real-time progress updates
 */
export function ObjectivesSidebar({ objectives, loading, title = "Objectives" }) {
  const totalObjectives = objectives?.length || 0;
  const masteredObjectives = objectives?.filter(obj => (obj.masteryLevel || 0) >= 0.8).length || 0;
  const averageMastery = totalObjectives > 0 
    ? objectives.reduce((sum, obj) => sum + (obj.masteryLevel || 0), 0) / totalObjectives 
    : 0;

  return (
    <div className="w-80 bg-bg-sidebar border-l border-border p-4 overflow-auto">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <Target className="w-5 h-5" />
          {title}
        </h3>
        <p className="text-sm text-text-secondary mt-1">
          Track your progress in real-time
        </p>
      </div>

      {/* Summary stats */}
      <div className="mb-4 p-3 bg-bg-primary rounded-lg">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-text-primary">
              {masteredObjectives}
            </div>
            <div className="text-xs text-text-secondary">Mastered</div>
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: masteryUtils.getMasteryColor(averageMastery) }}>
              {Math.round(averageMastery * 100)}%
            </div>
            <div className="text-xs text-text-secondary">Average</div>
          </div>
          <div>
            <div className="text-lg font-bold text-text-primary">
              {totalObjectives}
            </div>
            <div className="text-xs text-text-secondary">Total</div>
          </div>
        </div>
      </div>

      {/* Objectives list */}
      <ObjectivesList 
        objectives={objectives} 
        loading={loading}
        showDetails={true}
        size="small"
      />
    </div>
  );
}

/**
 * Mastery summary component
 * Shows overall mastery statistics
 */
export function MasterySummary({ objectives, loading }) {
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-bg-sidebar rounded mb-2" />
        <div className="h-4 bg-bg-sidebar rounded w-3/4" />
      </div>
    );
  }

  const totalObjectives = objectives?.length || 0;
  const masteredObjectives = objectives?.filter(obj => (obj.masteryLevel || 0) >= 0.8).length || 0;
  const strugglingObjectives = objectives?.filter(obj => (obj.masteryLevel || 0) < 0.4).length || 0;
  const averageMastery = totalObjectives > 0 
    ? objectives.reduce((sum, obj) => sum + (obj.masteryLevel || 0), 0) / totalObjectives 
    : 0;

  const stats = [
    {
      label: 'Total Objectives',
      value: totalObjectives,
      icon: Target,
      color: 'text-text-primary'
    },
    {
      label: 'Average Mastery',
      value: masteryUtils.formatMastery(averageMastery),
      icon: Award,
      color: masteryUtils.getMasteryColor(averageMastery)
    },
    {
      label: 'Mastered',
      value: masteredObjectives,
      icon: Award,
      color: '#05df72'
    },
    {
      label: 'Struggling',
      value: strugglingObjectives,
      icon: AlertTriangle,
      color: '#ff4444'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="text-center">
          <div className={`text-2xl font-bold ${stat.color} flex items-center justify-center gap-1`}>
            <stat.icon className="w-5 h-5" />
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

/**
 * Compact objective progress indicator
 * For use in tight spaces like cards or lists
 */
export function ObjectiveProgressIndicator({ objective, size = 'small' }) {
  const masteryLevel = objective?.masteryLevel || 0;
  const color = masteryUtils.getMasteryColor(masteryLevel);

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: color }} />
      <span className={`text-${size === 'small' ? 'xs' : 'sm'} text-text-primary`}>
        {masteryUtils.formatMastery(masteryLevel)}
      </span>
    </div>
  );
}

/**
 * Utility function for confidence color
 */
function getConfidenceColor(confidence) {
  if (confidence >= 0.8) return '#05df72';
  if (confidence >= 0.5) return '#2b7fff';
  return '#ffa500';
}
