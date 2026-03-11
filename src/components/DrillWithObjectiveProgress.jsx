import React, { useState, useEffect } from 'react';
import { ChevronRight, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Hierarchical objective item with progress bar
 */
function ObjectiveItem({ objective, numbering, depth = 0, isActive, justUpdated }) {
  const masteryPercentage = Math.round((objective.mastery_level || 0) * 100);
  
  // Determine mastery status and colors
  const masteryStatus = masteryPercentage >= 80 ? 'mastered' : 
                       masteryPercentage >= 50 ? 'progressing' : 
                       masteryPercentage >= 20 ? 'struggling' : 'not-started';
  
  const statusColors = {
    'mastered': 'bg-accent-green',
    'progressing': 'bg-accent-blue', 
    'struggling': 'bg-accent-orange',
    'not-started': 'bg-text-faint'
  };

  return (
    <div className={`rounded-md px-3 py-3 transition-colors ${
      isActive ? 'bg-[#1a1a1e]' : 'hover:bg-[#1a1a1e]'
    }`}>
      {/* Numbering + title */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="shrink-0 font-mono text-[11px] text-text-faint/80 font-medium">
          {numbering}.
        </span>
        <span className="font-sans text-[13px] leading-[18px] text-text-primary">
          {objective.objective}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-bg-sidebar rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ease-out ${statusColors[masteryStatus]} ${
            justUpdated ? 'animate-pulse' : ''
          }`}
          style={{ width: `${masteryPercentage}%` }}
        />
      </div>

      {/* Active indicator */}
      {isActive && !justUpdated && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-accent-blue rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
}

/**
 * Drill component with real-time objective progress sidebar
 * Shows all objectives with progress bars that update instantly after answers
 */
export function DrillWithObjectiveProgress({ drillId, userId, onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [optionsByQuestion, setOptionsByQuestion] = useState({});
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [confidence, setConfidence] = useState('medium');
  const [answers, setAnswers] = useState([]);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const options = currentQuestion ? optionsByQuestion[currentQuestion.id] || [] : [];
  const total = questions.length;
  const isLast = currentQuestionIndex >= total - 1;

  // Load drill questions and objectives
  useEffect(() => {
    const loadDrillData = async () => {
      if (!drillId) return;
      
      console.log('Loading drill data:', { drillId, userId });

      try {
        setLoading(true);

        // Load questions from set_questions
        const { data: qRows, error: qErr } = await supabase
          .from("set_questions")
          .select("id, question, difficulty, order")
          .eq("set_id", drillId)
          .order("order");

        console.log('Questions query result:', { data: qRows, error: qErr });
        
        if (qErr) throw qErr;
        setQuestions(qRows || []);

        // Load options
        const qIds = (qRows || []).map((q) => q.id);
        if (qIds.length > 0) {
          const { data: optRows, error: optErr } = await supabase
            .from("set_question_options")
            .select("id, question_id, text, correct, explanation")
            .in("question_id", qIds);

          if (optErr) throw optErr;
          
          const byQ = {};
          for (const o of optRows || []) {
            if (!byQ[o.question_id]) byQ[o.question_id] = [];
            byQ[o.question_id].push(o);
          }
          setOptionsByQuestion(byQ);
        }

        // Try to load objectives for this drill
        try {
          const response = await fetch(`/api/objectives-table/drill/${drillId}`);
          if (response.ok) {
            const objectivesData = await response.json();
            setObjectives(objectivesData);
          }
        } catch (error) {
          console.log('No objectives found for this drill, that\'s okay');
          setObjectives([]);
        }

      } catch (error) {
        console.error('Error loading drill data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDrillData();
  }, [drillId, userId]);

  // Handle option selection
  const handleSelect = (opt) => {
    if (revealed) return;
    setSelectedOptionId(opt.id);
  };

  // Handle answer check
  const handleCheck = async () => {
    if (selectedOptionId == null) return;

    const selectedOption = options.find(opt => opt.id === selectedOptionId);
    const correct = selectedOption?.correct || false;
    const responseTime = Date.now() - startTime;

    try {
      // Show immediate feedback animation
      setRevealed(true);

      // Try to record mastery update with real-time feedback
      try {
        console.log('Sending mastery update:', { userId, checkpointId: currentQuestion.id, correct, confidence, responseTimeMs: responseTime });
        
        const masteryResponse = await fetch('/api/objectives-table/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            checkpointId: currentQuestion.id,
            correct,
            confidence,
            responseTimeMs: responseTime
          })
        });

        console.log('Mastery response status:', masteryResponse.status);
        
        if (masteryResponse.ok) {
          const masteryResult = await masteryResponse.json();
          console.log('Mastery result:', masteryResult);

          // Update the objective progress immediately with animation
          setObjectives(prev => prev.map(obj => 
            obj.id === masteryResult.objectiveId 
              ? { 
                  ...obj, 
                  mastery_level: masteryResult.masteryLevel,
                  confidence: masteryResult.confidenceScore,
                  attempts: (obj.attempts || 0) + 1,
                  last_practiced: new Date().toISOString(),
                  isActive: true,
                  // Add animation trigger
                  justUpdated: true
                }
              : obj
          ));

          // Remove animation trigger after delay
          setTimeout(() => {
            setObjectives(prev => prev.map(obj => 
              ({ ...obj, justUpdated: false })
            ));
          }, 1000);
        } else {
          const errorText = await masteryResponse.text();
          console.error('Mastery API error:', masteryResponse.status, errorText);
        }
      } catch (masteryError) {
        console.error('Mastery tracking error:', masteryError);
      }

      // Record answer
      setAnswers(prev => [...prev, {
        questionIndex: currentQuestionIndex,
        correct,
        confidence,
        responseTime,
        questionId: currentQuestion.id
      }]);

    } catch (error) {
      console.error('Error handling answer:', error);
      setRevealed(true);
    }
  };

  // Handle next question
  const handleNext = () => {
    if (!revealed) return;
    
    setSelectedOptionId(null);
    setRevealed(false);
    setStartTime(Date.now());
    setConfidence('medium');

    // Clear active state
    setObjectives(prev => prev.map(obj => ({ ...obj, isActive: false })));

    if (isLast) {
      if (onComplete) {
        onComplete(answers);
      }
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
        <p className="font-sans text-[13px] text-text-secondary">Loading drill…</p>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
        <p className="font-sans text-[13px] text-text-secondary">No questions found for this drill.</p>
        <p className="font-sans text-[11px] text-text-faint">Drill ID: {drillId}</p>
        <p className="font-sans text-[11px] text-text-faint">User ID: {userId}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-bg-primary">
      {/* Main drill area - smaller width */}
      <div className="w-1/2 flex flex-col border-r border-border">
        {/* Header - more compact */}
        <div className="border-b border-border-default px-4 py-3 bg-bg-elevated">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-base font-semibold text-text-primary">
              Q{currentQuestionIndex + 1} of {total}
            </h2>
            <div className="text-xs text-text-secondary">
              {Math.round((currentQuestionIndex / total) * 100)}%
            </div>
          </div>
          <div className="w-full bg-bg-sidebar rounded-full h-1.5">
            <div 
              className="bg-accent-blue h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(currentQuestionIndex / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Question content - more compact */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="max-w-none">
            {/* Question */}
            <div className="bg-bg-elevated rounded-lg border border-border-default p-4 mb-4">
              <h3 className="text-sm font-medium text-text-primary mb-4 leading-relaxed">
                {currentQuestion?.question}
              </h3>

              {/* Confidence selector - more compact */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-text-primary mb-2">
                  Confidence:
                </label>
                <div className="flex gap-1">
                  {['low', 'medium', 'high'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setConfidence(level)}
                      className={`px-3 py-1.5 rounded-md capitalize text-xs transition-all border ${
                        confidence === level
                          ? 'bg-accent-blue text-white border-accent-blue'
                          : 'bg-bg-primary text-text-secondary border-border hover:border-accent-blue hover:text-text-primary'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Answer options - more compact */}
              <div className="space-y-2">
                {options.map((opt, index) => {
                  const selected = selectedOptionId === opt.id;
                  const showCorrect = revealed && opt.correct;
                  const showWrong = revealed && selected && !opt.correct;
                  
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelect(opt)}
                      disabled={revealed}
                      className={`w-full text-left p-3 rounded-md border transition-all ${
                        showCorrect
                          ? "border-accent-green bg-accent-green/10"
                          : showWrong
                            ? "border-red-500/50 bg-red-500/10"
                            : selected
                              ? "border-accent-blue bg-accent-blue/10"
                              : "border-border hover:border-accent-blue hover:bg-accent-blue/5"
                      } ${revealed ? "cursor-default" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-medium ${
                          showCorrect
                            ? "border-accent-green bg-accent-green text-white"
                            : showWrong
                              ? "border-red-500 bg-red-500 text-white"
                              : selected
                                ? "border-accent-blue bg-accent-blue text-white"
                                : "border-border"
                        }`}>
                          {showCorrect ? "✓" : showWrong ? "✗" : !revealed && selected ? index + 1 : ""}
                        </div>
                        <span className="text-sm text-text-primary">{opt.text}</span>
                      </div>
                      {revealed && opt.explanation && (
                        <div className="mt-2 pl-7 text-xs text-text-secondary border-l-2 border-border">
                          {opt.explanation}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action buttons - more compact */}
            <div className="flex justify-end gap-2">
              {!revealed ? (
                <button
                  onClick={handleCheck}
                  disabled={selectedOptionId == null}
                  className="flex cursor-pointer items-center gap-1 rounded-md bg-accent-blue px-3 py-2 font-sans text-[11px] font-medium text-white transition-colors hover:bg-accent-blue/80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Check
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex cursor-pointer items-center gap-1 rounded-md bg-accent-green px-3 py-2 font-sans text-[11px] font-medium text-white transition-colors hover:bg-accent-green/80"
                >
                  {isLast ? "Complete" : "Next"}
                  <ChevronRight className="size-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Objectives sidebar - simplified */}
      {objectives.length > 0 && (
        <div className="flex-1 bg-bg-sidebar flex flex-col">
          {/* Simple header */}
          <div className="p-4 border-b border-border-default">
            <h3 className="text-base font-semibold text-text-primary">
              Objectives
            </h3>
          </div>

          {/* Objectives list */}
          <div className="flex-1 overflow-auto p-4">
            <div className="flex flex-col gap-2">
              {objectives.map((objective, index) => (
                <ObjectiveItem 
                  key={objective.id} 
                  objective={objective}
                  numbering={`${index + 1}`}
                  depth={0}
                  isActive={objective.isActive}
                  justUpdated={objective.justUpdated}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/**
 * Utility functions
 */
function getMasteryColor(level) {
  if (level >= 0.8) return '#05df72'; // accent-green
  if (level >= 0.6) return '#2b7fff'; // accent-blue
  if (level >= 0.4) return '#ffa500'; // orange
  return '#ff4444'; // red
}

function getConfidenceColor(confidence) {
  if (confidence >= 0.8) return '#05df72';
  if (confidence >= 0.5) return '#2b7fff';
  return '#ffa500';
}
