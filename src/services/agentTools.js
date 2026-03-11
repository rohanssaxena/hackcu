/**
 * Agent Tools - All functions that the agent can call
 * This is the main entry point for agent-callable functions
 */

// Practice Set Management
export {
  listPracticeSets,
  getPracticeSet,
  createPracticeSet,
  updatePracticeSet,
  renamePracticeSet,
  deletePracticeSet,
  duplicatePracticeSet,
  getPracticeSetStats
} from './practiceSetService.js';

// Mindmap Navigation & Views
export {
  MINDMAP_VIEWS,
  getMindmapObjectives,
  getHierarchicalObjectives,
  getLearningPath,
  getMindmapStats,
  searchObjectives,
  getObjectivesByMastery,
  getRecentObjectives,
  getStrugglingObjectives,
  saveMindmapPreferences,
  getMindmapPreferences
} from './mindmapService.js';

// Navigation & Routing
export {
  navigateTo,
  openPracticeSetsPage,
  openPracticeSet,
  openDrill,
  openObjectiveDrill,
  openMindmapPage,
  switchMindmapView,
  applyMindmapFilters,
  openAnalyticsPage,
  openObjectivesAdmin,
  openDashboard,
  goBack,
  getCurrentRoute,
  getCurrentMindmapView,
  getCurrentMindmapFilters,
  createDeepLink,
  shareCurrentView,
  exportViewState,
  importViewState
} from './navigationService.js';

// Existing Services (re-exported for agent access)
export {
  listConversations,
  createConversation,
  updateConversation,
  deleteConversation,
  getConversation
} from '../lib/chatService.js';

export {
  recordCheckpointComplete,
  getCompletedCheckpoints,
  isCheckpointCompleted,
  clearCompletedCheckpoints
} from '../lib/checkpointProgressService.js';

export {
  getOutline,
  updateOutline,
  getCheckpointProgress
} from '../lib/outlineService.js';

/**
 * Tool Categories for Agent Reference
 */
export const AGENT_TOOLS = {
  // Practice Set Operations
  PRACTICE_SETS: {
    list: 'listPracticeSets',
    get: 'getPracticeSet', 
    create: 'createPracticeSet',
    update: 'updatePracticeSet',
    rename: 'renamePracticeSet',
    delete: 'deletePracticeSet',
    duplicate: 'duplicatePracticeSet',
    stats: 'getPracticeSetStats'
  },
  
  // Mindmap Operations
  MINDMAP: {
    getObjectives: 'getMindmapObjectives',
    getHierarchical: 'getHierarchicalObjectives',
    getLearningPath: 'getLearningPath',
    getStats: 'getMindmapStats',
    search: 'searchObjectives',
    getByMastery: 'getObjectivesByMastery',
    getRecent: 'getRecentObjectives',
    getStruggling: 'getStrugglingObjectives',
    savePreferences: 'saveMindmapPreferences',
    getPreferences: 'getMindmapPreferences'
  },
  
  // Navigation Operations
  NAVIGATION: {
    navigateTo: 'navigateTo',
    openPracticeSets: 'openPracticeSetsPage',
    openPracticeSet: 'openPracticeSet',
    openDrill: 'openDrill',
    openObjectiveDrill: 'openObjectiveDrill',
    openMindmap: 'openMindmapPage',
    switchMindmapView: 'switchMindmapView',
    applyMindmapFilters: 'applyMindmapFilters',
    openAnalytics: 'openAnalyticsPage',
    openAdmin: 'openObjectivesAdmin',
    openDashboard: 'openDashboard',
    goBack: 'goBack'
  },
  
  // Chat Operations
  CHAT: {
    listConversations: 'listConversations',
    createConversation: 'createConversation',
    updateConversation: 'updateConversation',
    deleteConversation: 'deleteConversation',
    getConversation: 'getConversation'
  },
  
  // Progress Operations
  PROGRESS: {
    recordCheckpoint: 'recordCheckpointComplete',
    getCompleted: 'getCompletedCheckpoints',
    isCompleted: 'isCheckpointCompleted',
    clearCompleted: 'clearCompletedCheckpoints'
  }
};

/**
 * Common Workflows for Agent
 */
export const AGENT_WORKFLOWS = {
  // Create and start a new practice set
  CREATE_AND_START_PRACTICE: async (setData) => {
    const newSet = await createPracticeSet(setData);
    openPracticeSet(newSet.id, 'view');
    return newSet;
  },
  
  // Open mindmap with specific view and filters
  OPEN_MINDMAP_WITH_FILTERS: async (view, filters) => {
    openMindmapPage(view, filters);
    const objectives = await getMindmapObjectives(filters);
    return objectives;
  },
  
  // Find struggling objectives and start drill
  PRACTICE_STRUGGLING_OBJECTIVES: async () => {
    const struggling = await getStrugglingObjectives();
    if (struggling.length > 0) {
      openObjectiveDrill(struggling[0].id);
    }
    return struggling;
  },
  
  // Get user progress overview
  GET_PROGRESS_OVERVIEW: async () => {
    const [practiceSets, mindmapStats, recentObjectives] = await Promise.all([
      listPracticeSets(),
      getMindmapStats(),
      getRecentObjectives()
    ]);
    
    return {
      practiceSets,
      mindmapStats,
      recentObjectives,
      summary: {
        totalPracticeSets: practiceSets.length,
        totalObjectives: mindmapStats.totalObjectives,
        averageMastery: mindmapStats.averageMastery,
        recentlyPracticed: recentObjectives.length
      }
    };
  }
};

/**
 * Helper function to get tool by name
 */
export function getTool(toolName) {
  const allTools = {
    // Practice sets
    listPracticeSets,
    getPracticeSet,
    createPracticeSet,
    updatePracticeSet,
    renamePracticeSet,
    deletePracticeSet,
    duplicatePracticeSet,
    getPracticeSetStats,
    
    // Mindmap
    getMindmapObjectives,
    getHierarchicalObjectives,
    getLearningPath,
    getMindmapStats,
    searchObjectives,
    getObjectivesByMastery,
    getRecentObjectives,
    getStrugglingObjectives,
    saveMindmapPreferences,
    getMindmapPreferences,
    
    // Navigation
    navigateTo,
    openPracticeSetsPage,
    openPracticeSet,
    openDrill,
    openObjectiveDrill,
    openMindmapPage,
    switchMindmapView,
    applyMindmapFilters,
    openAnalyticsPage,
    openObjectivesAdmin,
    openDashboard,
    goBack,
    getCurrentRoute,
    getCurrentMindmapView,
    getCurrentMindmapFilters,
    createDeepLink,
    shareCurrentView,
    exportViewState,
    importViewState,
    
    // Chat
    listConversations,
    createConversation,
    updateConversation,
    deleteConversation,
    getConversation,
    
    // Progress
    recordCheckpointComplete,
    getCompletedCheckpoints,
    isCheckpointCompleted,
    clearCompletedCheckpoints,
    
    // Outline
    getOutline,
    updateOutline,
    getCheckpointProgress
  };
  
  return allTools[toolName];
}

/**
 * Get all available tool names
 */
export function getAvailableTools() {
  return Object.keys(AGENT_TOOLS).reduce((acc, category) => {
    acc[category] = Object.values(AGENT_TOOLS[category]);
    return acc;
  }, {});
}
