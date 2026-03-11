import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Target, Save } from 'lucide-react';

/**
 * Admin component to add objectives to existing drills
 * This helps you set up the objective mastery tracking system
 */
export function ObjectivesAdmin() {
  const { folderId } = useParams();
  const [studySets, setStudySets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Load study sets for this folder
  useEffect(() => {
    const loadStudySets = async () => {
      try {
        const { data, error } = await supabase
          .from('study_sets')
          .select('id, title')
          .eq('folder_id', folderId);

        if (error) throw error;
        setStudySets(data || []);
      } catch (error) {
        console.error('Error loading study sets:', error);
      }
    };

    if (folderId) {
      loadStudySets();
    }
  }, [folderId]);

  // Load questions when a set is selected
  useEffect(() => {
    const loadQuestions = async () => {
      if (!selectedSet) return;

      try {
        setLoading(true);
        
        // Load questions
        const { data: qRows, error: qErr } = await supabase
          .from("set_questions")
          .select("id, question, difficulty, order")
          .eq("set_id", selectedSet)
          .order("order");

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
          
          const questionsWithOptions = qRows.map(q => ({
            ...q,
            options: optRows?.filter(opt => opt.question_id === q.id) || []
          }));
          setQuestions(questionsWithOptions);
        }

        // Initialize objectives (one per question for simplicity)
        const initialObjectives = qRows.map((q, index) => ({
          id: `obj_${index + 1}`,
          objective: `Objective ${index + 1}: ${q.question.substring(0, 50)}...`,
          questionIds: [q.id],
          weight: 5
        }));
        setObjectives(initialObjectives);

      } catch (error) {
        console.error('Error loading questions:', error);
        setMessage('Error loading questions');
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [selectedSet]);

  // Update objective text
  const updateObjective = (index, field, value) => {
    const newObjectives = [...objectives];
    newObjectives[index][field] = value;
    setObjectives(newObjectives);
  };

  // Save objectives to database
  const saveObjectives = async () => {
    if (!selectedSet) return;

    try {
      setLoading(true);
      setMessage('Saving objectives...');

      // Get content node for this study set (you might need to adjust this)
      const { data: contentNode, error: nodeError } = await supabase
        .from('content_nodes')
        .select('id')
        .eq('folder_id', folderId)
        .limit(1)
        .single();

      if (nodeError && nodeError.code !== 'PGRST116') {
        throw nodeError;
      }

      // Create content node if it doesn't exist
      let nodeId = contentNode?.id;
      if (!nodeId) {
        const { data: newNode, error: createError } = await supabase
          .from('content_nodes')
          .insert({
            folder_id: folderId,
            title: `Study Set: ${studySets.find(s => s.id === selectedSet)?.title}`,
            type: 'drill'
          })
          .select()
          .single();

        if (createError) throw createError;
        nodeId = newNode.id;
      }

      // Save objectives
      const objectivesToSave = objectives.map(obj => ({
        content_node_id: nodeId,
        objective: obj.objective,
        weight: obj.weight,
        checkpoints: obj.questionIds,
        alpha: 1.0,
        beta: 1.0,
        mastery_level: 0.0,
        attempts: 0,
        confidence_score: 0.0
      }));

      const { error: saveError } = await supabase
        .from('objectives')
        .upsert(objectivesToSave, { onConflict: 'content_node_id,objective' });

      if (saveError) throw saveError;

      setMessage('Objectives saved successfully! 🎉');
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error('Error saving objectives:', error);
      setMessage('Error saving objectives');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary mb-2">Objectives Admin</h2>
        <p className="text-text-secondary">
          Add learning objectives to your drills to enable progress tracking
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg mb-4 ${
          message.includes('success') ? 'bg-accent-green/10 text-accent-green' : 'bg-red-500/10 text-red-500'
        }`}>
          {message}
        </div>
      )}

      {/* Study Set Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-primary mb-2">
          Select Study Set
        </label>
        <select
          value={selectedSet || ''}
          onChange={(e) => setSelectedSet(e.target.value)}
          className="w-full p-2 border border-border rounded-lg bg-bg-primary text-text-primary"
        >
          <option value="">Choose a study set...</option>
          {studySets.map(set => (
            <option key={set.id} value={set.id}>
              {set.title}
            </option>
          ))}
        </select>
      </div>

      {selectedSet && (
        <>
          {/* Questions and Objectives */}
          <div className="space-y-6">
            {questions.map((question, index) => (
              <div key={question.id} className="p-4 bg-bg-sidebar rounded-lg">
                <div className="mb-3">
                  <h4 className="font-medium text-text-primary mb-1">
                    Question {index + 1}
                  </h4>
                  <p className="text-sm text-text-secondary">
                    {question.question}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-primary">
                    Learning Objective
                  </label>
                  <input
                    type="text"
                    value={objectives[index]?.objective || ''}
                    onChange={(e) => updateObjective(index, 'objective', e.target.value)}
                    placeholder="What skill does this question test?"
                    className="w-full p-2 border border-border rounded bg-bg-primary text-text-primary"
                  />
                </div>

                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-text-secondary">Weight:</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={objectives[index]?.weight || 5}
                      onChange={(e) => updateObjective(index, 'weight', parseInt(e.target.value))}
                      className="w-16 p-1 border border-border rounded bg-bg-primary text-text-primary text-sm"
                    />
                  </div>
                  <div className="text-xs text-text-secondary">
                    {question.options?.length || 0} options
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={saveObjectives}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/80 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Objectives'}
            </button>
          </div>
        </>
      )}

      {!selectedSet && studySets.length === 0 && (
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-text-secondary mx-auto mb-3" />
          <p className="text-text-secondary">
            No study sets found in this folder
          </p>
        </div>
      )}
    </div>
  );
}
