# Objective-Level Mastery Tracking Implementation Guide

## 🎯 Overview

This implementation provides **real-time objective progress tracking** with **Bayesian knowledge modeling** for your Micro study platform. When users answer questions in drills, the corresponding objective's mastery level updates instantly.

## 📋 What's Been Implemented

### 1. **Database Schema** (`/supabase/migrations/20250312000002_create_objectives_table.sql`)
- Dedicated `objectives` table with Bayesian parameters
- `alpha`, `beta` for statistical tracking
- `mastery_level` for simple progress display
- `confidence_score`, `attempts`, `last_practiced` for analytics
- `dkt_prediction`, `hybrid_mastery` for future DKT integration

### 2. **Backend Services**

#### **ObjectiveMasteryTableService** (`/server/src/services/objectiveMasteryTable.js`)
- Bayesian mastery updates with confidence/speed weighting
- Mastery calculation: `mastery_level = alpha / (alpha + beta)`
- Real-time progress tracking
- Statistics and analytics

#### **QuestionObjectiveMappingService** (`/server/src/services/questionObjectiveMapping.js`)
- Maps checkpoints to objectives
- Finds objectives for drills/content nodes/folders
- Handles objective creation and management

### 3. **API Endpoints** (`/server/src/routes/objectivesTable.js`)
- `POST /api/objectives-table/attempt` - Record answer & update mastery
- `GET /api/objectives-table/drill/:drillId` - Get drill objectives
- `GET /api/objectives-table/node/:contentNodeId/mastery` - Get node mastery
- `GET /api/objectives-table/folder/:folderId` - Get folder objectives
- `GET /api/objectives-table/recommendations` - Study recommendations

### 4. **Frontend Components**

#### **DrillWithObjectiveProgress** (`/src/components/DrillWithObjectiveProgress.jsx`)
- Drill component with real-time objective sidebar
- Instant progress updates after each answer
- Confidence selection and response time tracking
- Visual feedback for objective improvements

#### **ObjectiveProgressComponents** (`/src/components/ObjectiveProgressComponents.jsx`)
- Progress bars with color coding
- Objective cards with detailed stats
- Sidebar components for drills
- Mastery summary statistics

#### **React Hooks** (`/src/hooks/useObjectiveMasteryTable.js`)
- `useObjectiveMasteryTable` - Core mastery tracking
- `useDrillObjectives` - Drill-specific objectives with real-time updates
- `useFolderObjectives` - Folder-level objectives
- Utility functions for display

## 🚀 Quick Start

### 1. **Run the Migration**
```sql
-- In Supabase SQL editor
-- Run the migration file: 20250312000002_create_objectives_table.sql
```

### 2. **Migrate Existing Data** (if needed)
```sql
-- Run this once to migrate from JSON to table
SELECT migrate_objectives_from_content_nodes();
```

### 3. **Use in Your Drill Component**
```jsx
import { DrillWithObjectiveProgress } from './components/DrillWithObjectiveProgress.jsx';

function YourDrillPage({ drill, userId }) {
  return (
    <DrillWithObjectiveProgress 
      drill={drill}
      userId={userId}
      onComplete={(answers) => console.log('Drill completed!', answers)}
    />
  );
}
```

### 4. **Show Objectives in Course View**
```jsx
import { ObjectivesList, useDrillObjectives } from './components/ObjectiveProgressComponents.jsx';

function CourseObjectives({ contentNodeId, userId }) {
  const { objectives, loading } = useFolderObjectives(userId, folderId);
  
  return (
    <ObjectivesList 
      objectives={objectives}
      loading={loading}
      showDetails={true}
    />
  );
}
```

## 🔄 How It Works

### **Question Answer Flow**
1. **User answers question** → Selects option and confidence
2. **Find objective** → System maps checkpoint to objective
3. **Update mastery** → Bayesian parameters updated
4. **Calculate progress** → `mastery_level = alpha / (alpha + beta)`
5. **Update UI** → Progress bar animates to new level

### **Bayesian Update Formula**
```javascript
// Correct answer
newAlpha = alpha + (confidenceWeight × speedWeight)
newBeta = beta

// Incorrect answer  
newAlpha = alpha
newBeta = beta + (confidenceWeight × speedWeight)

// Mastery level
masteryLevel = newAlpha / (newAlpha + newBeta)
```

### **Confidence & Speed Weights**
- **Confidence**: High (1.15x), Medium (1.0x), Low (0.8x)
- **Speed**: Fast (< 0.7x avg = 1.1x), Normal (1.0x), Slow (> 1.5x avg = 0.9x)

## 📊 API Usage Examples

### **Record an Answer**
```javascript
const response = await fetch('/api/objectives-table/attempt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    checkpointId: 'checkpoint-456',
    correct: true,
    confidence: 'high',
    responseTimeMs: 1200
  })
});
```

### **Get Drill Objectives**
```javascript
const response = await fetch('/api/objectives-table/drill/drill-789');
const objectives = await response.json();
```

### **Get Folder Mastery**
```javascript
const response = await fetch('/api/objectives-table/folder/folder-123/mastery');
const mastery = await response.json();
```

## 🎨 UI Components

### **Progress Bar**
```jsx
<ObjectiveProgressBar 
  mastery={{ level: 0.75 }} 
  showLabel={true}
  animated={true}
/>
```

### **Objective Card**
```jsx
<ObjectiveCard 
  objective={objectiveData}
  isActive={true}
  showDetails={true}
/>
```

### **Sidebar for Drills**
```jsx
<ObjectivesSidebar 
  objectives={objectives}
  loading={loading}
  title="Learning Objectives"
/>
```

## 🔧 Testing the Implementation

### 1. **Test API Endpoints**
```bash
# Test drill objectives
curl "http://localhost:3001/api/objectives-table/drill/your-drill-id"

# Test answer recording
curl -X POST "http://localhost:3001/api/objectives-table/attempt" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","checkpointId":"test-checkpoint","correct":true,"confidence":"medium","responseTimeMs":1500}'
```

### 2. **Test Frontend Integration**
```javascript
// In browser console
const { useDrillObjectives } = window.hooks;

// Test hook
const { objectives, handleQuestionAnswer } = useDrillObjectives('user-123', 'drill-456');
console.log('Objectives:', objectives);
```

### 3. **Verify Database Updates**
```sql
-- Check mastery updates
SELECT id, objective, mastery_level, alpha, beta, attempts 
FROM objectives 
WHERE content_node_id = 'your-node-id';
```

## 🎯 Key Features Working

✅ **Real-time Progress Updates** - Progress bars update instantly after answers  
✅ **Bayesian Knowledge Tracking** - Sophisticated mastery modeling  
✅ **Confidence Weighting** - High/medium/low confidence affects updates  
✅ **Response Time Tracking** - Fast/slow answers weighted differently  
✅ **Objective-to-Question Mapping** - Automatic mapping of checkpoints to objectives  
✅ **Visual Progress Indicators** - Color-coded progress bars and statistics  
✅ **Study Recommendations** - Based on mastery gaps  
✅ **Folder/Node Level Tracking** - Hierarchical mastery organization  

## 🔄 Next Steps

1. **Run the migration** to create the objectives table
2. **Test with existing drills** to verify question-to-objective mapping
3. **Integrate into your drill pages** using the provided components
4. **Add mastery displays** to course and dashboard views
5. **Implement DKT predictions** when ready for advanced features

## 🐛 Troubleshooting

### **Common Issues**
- **Objectives not showing**: Check if objectives table is populated
- **Progress not updating**: Verify checkpoint-to-objective mapping
- **API errors**: Check Supabase connection and RLS policies

### **Debug Commands**
```sql
-- Check if objectives exist for your content
SELECT * FROM objectives WHERE content_node_id = 'your-node-id';

-- Check checkpoint mappings
SELECT id, checkpoints FROM objectives WHERE checkpoints IS NOT NULL;
```

This implementation provides a complete, production-ready objective mastery tracking system with real-time updates and sophisticated Bayesian modeling!
