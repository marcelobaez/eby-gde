import axios from "axios";

export interface SearchLogData {
  page: string;
  query: string;
  logTime: string;
  userId: number;
  userEmail: string;
  filters?: Record<string, any>;
  resultCount?: number;
}

interface StrapiSearchLogPayload {
  data: {
    page: string;
    query: string;
    logTime: string;
    userId: number;
    userEmail: string;
    filters?: Record<string, any>;
    resultCount?: number;
  };
}

/**
 * Logs a search action to Strapi backend
 * @param searchData - The search data to log
 */
export async function logSearch(searchData: SearchLogData): Promise<void> {
  try {
    const payload: StrapiSearchLogPayload = {
      data: {
        ...searchData,
        logTime: new Date().toISOString(),
      }
    };

    // Send to Strapi API
    await axios.post('/api/search-logs', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000, // 5 second timeout
    });
  } catch (error) {
    // Log error but don't throw - we don't want search logging to break the UI
    console.error('Failed to log search:', error);
  }
}

/**
 * Helper function to create search log data from session and search parameters
 */
export function createSearchLogData(
  page: string,
  query: string,
  userSession: any,
  filters?: Record<string, any>,
  resultCount?: number
): SearchLogData {
  return {
    page,
    query,
    logTime: new Date().toISOString(),
    userId: userSession?.id || 0,
    userEmail: userSession?.user?.email || 'unknown',
    filters,
    resultCount,
  };
}