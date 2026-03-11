/**
 * Navigation service for agent to control app routing
 */

/**
 * Navigate to a specific page/route
 */
export function navigateTo(path, state = {}) {
  if (typeof window !== 'undefined' && window.history) {
    window.history.pushState(state, '', path);
    // Trigger a popstate event to notify React Router
    window.dispatchEvent(new PopStateEvent('popstate', { state }));
  }
}

/**
 * Open practice sets page
 */
export function openPracticeSetsPage(filters = {}) {
  const params = new URLSearchParams();
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.search) params.set('search', filters.search);
  if (filters.sort) params.set('sort', filters.sort);
  
  const path = params.toString() ? `/practice-sets?${params.toString()}` : '/practice-sets';
  navigateTo(path, { page: 'practice-sets', filters });
}

/**
 * Open specific practice set
 */
export function openPracticeSet(setId, mode = 'view') {
  navigateTo(`/practice-sets/${setId}?mode=${mode}`, { 
    page: 'practice-set-detail', 
    setId, 
    mode 
  });
}

/**
 * Open drill for a practice set
 */
export function openDrill(setId, userId = 'current-user') {
  navigateTo(`/drill/${setId}?user=${userId}`, { 
    page: 'drill', 
    setId, 
    userId 
  });
}

/**
 * Open drill for specific objective
 */
export function openObjectiveDrill(objectiveId, userId = 'current-user') {
  navigateTo(`/drill/objective/${objectiveId}?user=${userId}`, { 
    page: 'objective-drill', 
    objectiveId, 
    userId 
  });
}

/**
 * Open mindmap page
 */
export function openMindmapPage(view = 'hierarchical', filters = {}) {
  const params = new URLSearchParams();
  params.set('view', view);
  if (filters.masteryRange) {
    params.set('masteryMin', filters.masteryRange[0]);
    params.set('masteryMax', filters.masteryRange[1]);
  }
  if (filters.search) params.set('search', filters.search);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  
  navigateTo(`/mindmap?${params.toString()}`, { 
    page: 'mindmap', 
    view, 
    filters 
  });
}

/**
 * Switch mindmap view
 */
export function switchMindmapView(newView) {
  if (typeof window !== 'undefined') {
    const currentUrl = new URL(window.location);
    currentUrl.searchParams.set('view', newView);
    
    navigateTo(currentUrl.pathname + currentUrl.search, {
      page: 'mindmap',
      view: newView,
      filters: Object.fromEntries(currentUrl.searchParams)
    });
  }
}

/**
 * Apply mindmap filters
 */
export function applyMindmapFilters(filters) {
  if (typeof window !== 'undefined') {
    const currentUrl = new URL(window.location);
    
    // Update filter parameters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          currentUrl.searchParams.set(`${key}Min`, value[0]);
          currentUrl.searchParams.set(`${key}Max`, value[1]);
        } else {
          currentUrl.searchParams.set(key, value);
        }
      } else {
        // Remove parameter if value is empty
        currentUrl.searchParams.delete(key);
        currentUrl.searchParams.delete(`${key}Min`);
        currentUrl.searchParams.delete(`${key}Max`);
      }
    });
    
    navigateTo(currentUrl.pathname + currentUrl.search, {
      page: 'mindmap',
      view: currentUrl.searchParams.get('view') || 'hierarchical',
      filters
    });
  }
}

/**
 * Open analytics page
 */
export function openAnalyticsPage(report = 'overview', timeRange = '30d') {
  navigateTo(`/analytics?report=${report}&range=${timeRange}`, { 
    page: 'analytics', 
    report, 
    timeRange 
  });
}

/**
 * Open objectives admin page
 */
export function openObjectivesAdmin() {
  navigateTo('/admin/objectives', { page: 'objectives-admin' });
}

/**
 * Open dashboard
 */
export function openDashboard() {
  navigateTo('/dashboard', { page: 'dashboard' });
}

/**
 * Go back to previous page
 */
export function goBack() {
  if (typeof window !== 'undefined' && window.history) {
    window.history.back();
  }
}

/**
 * Get current route information
 */
export function getCurrentRoute() {
  if (typeof window !== 'undefined') {
    return {
      path: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      params: Object.fromEntries(new URLSearchParams(window.location.search))
    };
  }
  return null;
}

/**
 * Get current mindmap view from URL
 */
export function getCurrentMindmapView() {
  const route = getCurrentRoute();
  return route?.params?.view || 'hierarchical';
}

/**
 * Get current mindmap filters from URL
 */
export function getCurrentMindmapFilters() {
  const route = getCurrentRoute();
  const params = route?.params || {};
  
  const filters = {
    search: params.search,
    sort: params.sort,
    difficulty: params.difficulty
  };
  
  // Parse range filters
  if (params.masteryMin !== undefined && params.masteryMax !== undefined) {
    filters.masteryRange = [parseFloat(params.masteryMin), parseFloat(params.masteryMax)];
  }
  
  return filters;
}

/**
 * Create a deep link to specific content
 */
export function createDeepLink(page, params = {}) {
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'http://localhost:3001';
    
  const pathMap = {
    'practice-sets': '/practice-sets',
    'practice-set': '/practice-sets',
    'drill': '/drill',
    'mindmap': '/mindmap',
    'analytics': '/analytics',
    'dashboard': '/dashboard',
    'admin': '/admin'
  };
  
  let path = pathMap[page] || `/${page}`;
  
  if (page === 'practice-set' && params.setId) {
    path += `/${params.setId}`;
  } else if (page === 'drill' && params.setId) {
    path += `/${params.setId}`;
  } else if (page === 'drill' && params.objectiveId) {
    path += `/objective/${params.objectiveId}`;
  } else if (page === 'admin' && params.section) {
    path += `/${params.section}`;
  }
  
  const queryString = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (!['setId', 'objectiveId', 'section'].includes(key) && 
        value !== undefined && value !== null && value !== '') {
      queryString.set(key, value);
    }
  });
  
  const fullUrl = queryString.toString() 
    ? `${baseUrl}${path}?${queryString.toString()}`
    : `${baseUrl}${path}`;
    
  return fullUrl;
}

/**
 * Share current view
 */
export function shareCurrentView() {
  const route = getCurrentRoute();
  if (route && navigator.share) {
    return navigator.share({
      title: 'Learning Progress',
      url: window.location.href
    });
  } else if (route) {
    // Copy to clipboard as fallback
    navigator.clipboard.writeText(window.location.href);
    return Promise.resolve();
  }
  return Promise.reject(new Error('Sharing not available'));
}

/**
 * Export current view state
 */
export function exportViewState() {
  const route = getCurrentRoute();
  if (!route) return null;
  
  return {
    path: route.path,
    search: route.search,
    params: route.params,
    timestamp: new Date().toISOString()
  };
}

/**
 * Import view state
 */
export function importViewState(viewState) {
  if (viewState?.path) {
    navigateTo(viewState.path + (viewState.search || ''), viewState);
  }
}
