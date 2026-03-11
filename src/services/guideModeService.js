/**
 * Guide Mode Service - Provides step-by-step guides for complex tasks
 */

import { openPracticeSetsPage, openMindmapPage, switchMindmapView, createPracticeSet } from './agentTools.js';

/**
 * Create Test Drill 1 for APPM 1360
 */
export function createTestDrillGuide() {
  return [
    {
      title: "Navigate to APPM 1360 Course",
      description: "First, let's go to the APPM 1360 course page",
      content: "Opening the course page...",
      requiresUserAction: false,
      autoAdvanceDelay: 1500,
      onAction: () => {
        // Navigate to the course page
        window.location.href = "/course/saxy";
      }
    },
    {
      title: "Generate New Drill",
      description: "Click the 'Generate Drill' button to create a new practice drill",
      content: "Look for the drill generation option in the course interface",
      requiresUserAction: true,
      actionText: "I've opened the drill generator",
      onAction: () => {
        // The user will click the generate drill button
        console.log("User opened drill generator");
      }
    },
    {
      title: "Name the Drill",
      description: "Enter 'Test Drill 1' as the drill name",
      content: "This will be your first practice drill for APPM 1360",
      requiresUserAction: true,
      actionText: "I've named the drill",
      onAction: () => {
        // User will name the drill
        console.log("User named the drill");
      }
    },
    {
      title: "Select Content",
      description: "Choose the topics/questions you want to practice",
      content: "Select relevant content from APPM 1360",
      requiresUserAction: true,
      actionText: "I've selected the content",
      onAction: () => {
        // User will select content
        console.log("User selected content");
      }
    },
    {
      title: "Generate Drill",
      description: "Click 'Generate Drill' to create the questions",
      content: "The system will create practice questions based on your selection",
      requiresUserAction: true,
      actionText: "I've generated the drill",
      onAction: () => {
        // User will generate the drill
        console.log("User generated drill");
      }
    },
    {
      title: "Start the Drill",
      description: "Click 'Start Drill' to begin practicing",
      content: "You'll see the split-screen interface with questions and objectives progress",
      requiresUserAction: true,
      actionText: "I'm starting the drill",
      onAction: () => {
        // User will start the drill
        console.log("User started drill");
      }
    },
    {
      title: "Answer Questions",
      description: "Answer the practice questions with confidence levels",
      content: "Watch your objectives progress update in real-time on the right side",
      requiresUserAction: true,
      actionText: "I've completed the drill",
      onAction: () => {
        // User will complete the drill
        console.log("User completed drill");
      }
    }
  ];
}

/**
 * Navigate Mindmap Views
 */
export function navigateMindmapGuide() {
  return [
    {
      title: "Open Mindmap Page",
      description: "Navigate to the mindmap overview page",
      content: "Opening the mindmap interface...",
      requiresUserAction: false,
      autoAdvanceDelay: 1500,
      onAction: () => {
        openMindmapPage('hierarchical');
      }
    },
    {
      title: "Explore Hierarchical View",
      description: "Look at the tree structure of your learning objectives",
      content: "This shows parent-child relationships between objectives",
      requiresUserAction: true,
      actionText: "I've explored the tree view",
      onAction: () => {
        console.log("User explored hierarchical view");
      }
    },
    {
      title: "Switch to Linear View",
      description: "Click the 'Linear' button to see all objectives in a list",
      content: "This view shows detailed stats for each objective",
      requiresUserAction: true,
      actionText: "I've switched to linear view",
      onAction: () => {
        switchMindmapView('linear');
      }
    },
    {
      title: "Try Heatmap View",
      description: "Click 'Heatmap' to see visual mastery levels",
      content: "Colors indicate mastery levels - green for mastered, red for struggling",
      requiresUserAction: true,
      actionText: "I've viewed the heatmap",
      onAction: () => {
        switchMindmapView('heatmap');
      }
    },
    {
      title: "Check Learning Path",
      description: "Click 'Path' to see recommended learning sequence",
      content: "This shows the best order to practice objectives",
      requiresUserAction: true,
      actionText: "I've seen the learning path",
      onAction: () => {
        switchMindmapView('path');
      }
    }
  ];
}

/**
 * Create New Practice Set
 */
export function createPracticeSetGuide() {
  return [
    {
      title: "Open Practice Sets Page",
      description: "Navigate to the practice sets management page",
      content: "Opening practice sets interface...",
      requiresUserAction: false,
      autoAdvanceDelay: 1500,
      onAction: () => {
        openPracticeSetsPage();
      }
    },
    {
      title: "Create New Set",
      description: "Click 'Create Practice Set' to start building a new set",
      content: "This will open the practice set creation form",
      requiresUserAction: true,
      actionText: "I've opened the creation form",
      onAction: () => {
        console.log("User opened creation form");
      }
    },
    {
      title: "Set Basic Details",
      description: "Fill in the title, description, and difficulty level",
      content: "Provide clear information about what this practice set covers",
      requiresUserAction: true,
      actionText: "I've filled in the details",
      onAction: () => {
        console.log("User filled in details");
      }
    },
    {
      title: "Add Learning Objectives",
      description: "Create learning objectives for this practice set",
      content: "Each objective should be clear and measurable",
      requiresUserAction: true,
      actionText: "I've added objectives",
      onAction: () => {
        console.log("User added objectives");
      }
    },
    {
      title: "Create Questions",
      description: "Add multiple-choice questions with 4 options each",
      content: "Make sure each question has exactly one correct answer",
      requiresUserAction: true,
      actionText: "I've created questions",
      onAction: () => {
        console.log("User created questions");
      }
    },
    {
      title: "Map Questions to Objectives",
      description: "Link each question to appropriate learning objectives",
      content: "This enables mastery tracking for each objective",
      requiresUserAction: true,
      actionText: "I've mapped the questions",
      onAction: () => {
        console.log("User mapped questions");
      }
    },
    {
      title: "Save Practice Set",
      description: "Review and save your new practice set",
      content: "Your practice set will be ready for students to use",
      requiresUserAction: true,
      actionText: "I've saved the practice set",
      onAction: () => {
        console.log("User saved practice set");
      }
    }
  ];
}

/**
 * Review Progress Analytics
 */
export function reviewProgressGuide() {
  return [
    {
      title: "Open Analytics Page",
      description: "Navigate to the analytics and reporting section",
      content: "Opening analytics dashboard...",
      requiresUserAction: false,
      autoAdvanceDelay: 1500,
      onAction: () => {
        window.location.href = "/analytics";
      }
    },
    {
      title: "View Progress Overview",
      description: "Look at your overall learning progress summary",
      content: "This shows mastery levels, completion rates, and trends",
      requiresUserAction: true,
      actionText: "I've reviewed the overview",
      onAction: () => {
        console.log("User reviewed overview");
      }
    },
    {
      title: "Check Objective Mastery",
      description: "Examine detailed mastery levels for each objective",
      content: "Identify which objectives need more practice",
      requiresUserAction: true,
      actionText: "I've checked mastery levels",
      onAction: () => {
        console.log("User checked mastery levels");
      }
    },
    {
      title: "Analyze Confidence Accuracy",
      description: "Review how well your confidence predictions match actual performance",
      content: "This helps improve self-assessment skills",
      requiresUserAction: true,
      actionText: "I've analyzed confidence",
      onAction: () => {
        console.log("User analyzed confidence");
      }
    },
    {
      title: "Export Progress Report",
      description: "Generate and download a detailed progress report",
      content: "Choose your preferred format (PDF, CSV, or JSON)",
      requiresUserAction: true,
      actionText: "I've exported the report",
      onAction: () => {
        console.log("User exported report");
      }
    }
  ];
}

/**
 * Get guide by name
 */
export function getGuide(guideName) {
  const guides = {
    'create-test-drill': createTestDrillGuide(),
    'navigate-mindmap': navigateMindmapGuide(),
    'create-practice-set': createPracticeSetGuide(),
    'review-progress': reviewProgressGuide()
  };
  
  return guides[guideName] || null;
}

/**
 * Check if a task should trigger guide mode prompt
 */
export function shouldPromptForGuide(taskDescription, taskComplexity) {
  // Simple heuristic for when to suggest guide mode
  const complexKeywords = [
    'create', 'build', 'set up', 'configure', 'implement',
    'navigate', 'review', 'analyze', 'generate', 'multiple',
    'step by step', 'guide', 'tutorial', 'walk through'
  ];
  
  const hasComplexKeyword = complexKeywords.some(keyword => 
    taskDescription.toLowerCase().includes(keyword)
  );
  
  const isComplex = taskComplexity > 3; // Scale of 1-5
  
  return hasComplexKeyword || isComplex;
}

/**
 * Get guide suggestion prompt text
 */
export function getGuideSuggestion(taskDescription) {
  return {
    title: "Use Guide Mode?",
    description: `This task involves multiple steps. Would you like me to guide you through "${taskDescription}" step by step?`
  };
}
