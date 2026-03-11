import React, { useState, useEffect } from 'react';
import { useObjectiveMastery, useStudyRecommendations, masteryUtils } from '../hooks/useObjectiveMastery';
import { 
  ObjectiveMasteryList, 
  StudyRecommendations, 
  MasteryStats,
  ContentNodeMasterySummary 
} from '../components/ObjectiveMastery';
import { CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';

/**
 * Enhanced Course component with objective-level mastery tracking
 * Integrates mastery display into the existing Course page structure
 */
export function CourseWithMastery({ courseId, folderId, userId }) {
  const [contentNodes, setContentNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Mastery tracking hooks
  const { folderMastery, loading: masteryLoading } = useFolderMastery(userId, folderId);
  const { recommendations, loading: recLoading } = useStudyRecommendations(userId, folderId);

  // Load content nodes for the folder
  useEffect(() => {
    const loadContentNodes = async () => {
      try {
        setLoading(true);
        
        // This would typically come from your existing content loading logic
        const response = await fetch(`/api/content/nodes?folder_id=${folderId}`);
        const data = await response.json();
        
        setContentNodes(data);
        
        // Select first node by default
        if (data.length > 0) {
          setSelectedNode(data[0]);
        }
      } catch (error) {
        console.error('Error loading content nodes:', error);
      } finally {
        setLoading(false);
      }
    };

    if (folderId) {
      loadContentNodes();
    }
  }, [folderId]);

  // Handle recommendation click
  const handleRecommendationClick = (recommendation) => {
    // Find and select the recommended content node
    const node = contentNodes.find(n => n.id === recommendation.contentNodeId);
    if (node) {
      setSelectedNode(node);
      setActiveTab('content');
    }
  };

  // Record checkpoint attempt
  const handleCheckpointAttempt = async (checkpointId, correct, confidence, responseTime) => {
    try {
      // This would be called from your checkpoint/drill components
      const response = await fetch('/api/objectives/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          checkpointId,
          correct,
          confidence,
          responseTimeMs: responseTime
        })
      });

      const result = await response.json();
      
      // You could show a toast notification or update UI here
      console.log('Mastery updated:', result);
      
      return result;
    } catch (error) {
      console.error('Error recording attempt:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Course Header with Mastery Overview */}
      <div className="p-6 border-b border-border">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            {selectedNode?.title || 'Course Content'}
          </h1>
          <p className="text-text-secondary">
            Track your progress through each learning objective
          </p>
        </div>

        {/* Mastery Statistics */}
        <MasteryStats folderMastery={folderMastery} loading={masteryLoading} />
      </div>

      {/* Course Tabs */}
      <div className="flex border-b border-border">
        {['overview', 'content', 'objectives', 'recommendations'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-accent-blue border-b-2 border-accent-blue'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Recent Progress */}
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Recent Progress
              </h2>
              <div className="grid gap-4">
                {contentNodes.slice(0, 3).map((node) => (
                  <div key={node.id} className="p-4 bg-bg-sidebar rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-text-primary">{node.title}</h3>
                      <ContentNodeMasterySummary
                        objectives={node.objectives || []}
                        objectiveMastery={folderMastery[node.id]?.objectives || {}}
                      />
                    </div>
                    <ObjectiveMasteryList
                      objectives={node.objectives || []}
                      objectiveMastery={folderMastery[node.id]?.objectives || {}}
                      loading={masteryLoading}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Study Recommendations */}
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Recommended Practice
              </h2>
              <StudyRecommendations
                recommendations={recommendations}
                loading={recLoading}
                onRecommendationClick={handleRecommendationClick}
              />
            </div>
          </div>
        )}

        {activeTab === 'content' && selectedNode && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                {selectedNode.title}
              </h2>
              
              {/* Objectives with Mastery */}
              <div className="mb-6">
                <h3 className="text-md font-medium text-text-primary mb-3">Learning Objectives</h3>
                <ObjectiveMasteryList
                  objectives={selectedNode.objectives || []}
                  objectiveMastery={folderMastery[selectedNode.id]?.objectives || {}}
                  loading={masteryLoading}
                />
              </div>

              {/* Content phases would go here */}
              <div className="text-text-secondary">
                Content phases and checkpoints would be displayed here...
              </div>
            </div>
          </div>
        )}

        {activeTab === 'objectives' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-text-primary">All Objectives</h2>
            
            {contentNodes.map((node) => (
              <div key={node.id} className="p-4 bg-bg-sidebar rounded-lg">
                <h3 className="font-medium text-text-primary mb-3">{node.title}</h3>
                <ObjectiveMasteryList
                  objectives={node.objectives || []}
                  objectiveMastery={folderMastery[node.id]?.objectives || {}}
                  loading={masteryLoading}
                />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Study Recommendations
            </h2>
            
            <StudyRecommendations
              recommendations={recommendations}
              loading={recLoading}
              onRecommendationClick={handleRecommendationClick}
            />

            {recommendations.length === 0 && !recLoading && (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-accent-green mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  All Caught Up!
                </h3>
                <p className="text-text-secondary">
                  You're making great progress on all your objectives.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Enhanced Drill component with mastery tracking integration
 * This would replace or enhance your existing Drill.jsx
 */
export function DrillWithMastery({ drill, userId, onAnswer }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [confidence, setConfidence] = useState('medium');

  const handleAnswer = async (selectedOption) => {
    const responseTime = Date.now() - startTime;
    const correct = drill.checkpoints[currentQuestion].options.find(opt => opt.correct).text === selectedOption;

    try {
      // Record the attempt and update mastery
      await fetch('/api/objectives/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          checkpointId: drill.checkpoints[currentQuestion].id,
          correct,
          confidence,
          responseTimeMs: responseTime
        })
      });

      // Notify parent component
      if (onAnswer) {
        onAnswer({
          questionIndex: currentQuestion,
          correct,
          confidence,
          responseTime
        });
      }

      // Move to next question
      if (currentQuestion < drill.checkpoints.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setStartTime(Date.now());
        setConfidence('medium');
      }
    } catch (error) {
      console.error('Error recording answer:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Question content */}
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-4">
          Question {currentQuestion + 1} of {drill.checkpoints.length}
        </h3>
        
        <div className="p-4 bg-bg-sidebar rounded-lg mb-4">
          {drill.checkpoints[currentQuestion].question}
        </div>

        {/* Confidence selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-primary mb-2">
            How confident are you?
          </label>
          <div className="flex gap-2">
            {['low', 'medium', 'high'].map((level) => (
              <button
                key={level}
                onClick={() => setConfidence(level)}
                className={`px-3 py-1 rounded capitalize text-sm ${
                  confidence === level
                    ? 'bg-accent-blue text-white'
                    : 'bg-bg-sidebar text-text-secondary hover:text-text-primary'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Answer options */}
        <div className="space-y-2">
          {drill.checkpoints[currentQuestion].options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(option.text)}
              className="w-full text-left p-3 bg-bg-sidebar rounded-lg hover:bg-accent-blue/10 transition-colors"
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
