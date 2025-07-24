/**
 * Sales Data Cache Service
 * Handles efficient caching and background loading of large sales datasets
 */

import { SalesVoucher, PaginatedSalesResponse, SalesStatistics } from '../api/sales/salesApiService';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface PaginationCache {
  [key: string]: {
    data: SalesVoucher[];
    totalCount: number;
    lastUpdated: number;
  };
}

type CacheValue = SalesStatistics | PaginatedSalesResponse | SalesVoucher[];

class SalesCacheService {
  private static instance: SalesCacheService;
  private cache = new Map<string, CacheEntry<CacheValue>>();
  private paginationCache: PaginationCache = {};
  private backgroundTasks = new Map<string, Promise<unknown>>();
  
  // Cache configuration
  private readonly CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100; // Maximum cache entries
  private readonly PREFETCH_PAGES = 3; // Number of pages to prefetch
  
  private constructor() {}

  static getInstance(): SalesCacheService {
    if (!SalesCacheService.instance) {
      SalesCacheService.instance = new SalesCacheService();
    }
    return SalesCacheService.instance;
  }

  /**
   * Generate cache key for sales data
   */
  private generateCacheKey(prefix: string, params: Record<string, string | number>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }

  /**
   * Check if cache entry is valid
   */
  private isValidCache<T>(entry: CacheEntry<T>): boolean {
    return Date.now() < entry.expiry;
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now >= entry.expiry) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    // Limit cache size
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const entriesToRemove = sortedEntries.slice(0, sortedEntries.length - this.MAX_CACHE_SIZE);
      entriesToRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Set cache entry
   */
  private setCache(key: string, data: CacheValue, expiryMs: number = this.CACHE_EXPIRY_MS): void {
    this.cleanExpiredCache();
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + expiryMs
    });
  }

  /**
   * Get cache entry
   */
  private getCache<T extends CacheValue>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry || !this.isValidCache(entry)) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Cache sales statistics
   */
  cacheSalesStatistics(
    fromDate: string,
    toDate: string,
    companyName: string,
    statistics: SalesStatistics
  ): void {
    const key = this.generateCacheKey('stats', { fromDate, toDate, companyName });
    this.setCache(key, statistics);
  }

  /**
   * Get cached sales statistics
   */
  getCachedSalesStatistics(
    fromDate: string,
    toDate: string,
    companyName: string
  ): SalesStatistics | null {
    const key = this.generateCacheKey('stats', { fromDate, toDate, companyName });
    return this.getCache<SalesStatistics>(key);
  }

  /**
   * Cache paginated sales data with intelligent page management
   */
  cacheSalesPage(
    fromDate: string,
    toDate: string,
    companyName: string,
    page: number,
    pageSize: number,
    searchFilter: string,
    response: PaginatedSalesResponse
  ): void {
    const baseKey = this.generateCacheKey('sales', { fromDate, toDate, companyName, pageSize, searchFilter });
    
    if (!this.paginationCache[baseKey]) {
      this.paginationCache[baseKey] = {
        data: [],
        totalCount: response.totalCount,
        lastUpdated: Date.now()
      };
    }

    // Store page data in the correct position
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + response.data.length;
    
    // Extend array if needed
    while (this.paginationCache[baseKey].data.length < endIndex) {
      this.paginationCache[baseKey].data.push({} as SalesVoucher);
    }
    
    // Insert page data
    response.data.forEach((voucher, index) => {
      this.paginationCache[baseKey].data[startIndex + index] = voucher;
    });
    
    this.paginationCache[baseKey].totalCount = response.totalCount;
    this.paginationCache[baseKey].lastUpdated = Date.now();
  }

  /**
   * Get cached sales page data
   */
  getCachedSalesPage(
    fromDate: string,
    toDate: string,
    companyName: string,
    page: number,
    pageSize: number,
    searchFilter: string
  ): PaginatedSalesResponse | null {
    const baseKey = this.generateCacheKey('sales', { fromDate, toDate, companyName, pageSize, searchFilter });
    const cached = this.paginationCache[baseKey];
    
    if (!cached || Date.now() - cached.lastUpdated > this.CACHE_EXPIRY_MS) {
      return null;
    }

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    // Check if we have data for this page
    const pageData = cached.data.slice(startIndex, endIndex);
    if (pageData.length === 0 || pageData.some(item => !item.id)) {
      return null;
    }

    return {
      data: pageData.filter(item => item.id), // Filter out empty slots
      totalCount: cached.totalCount,
      page,
      pageSize,
      hasMore: endIndex < cached.totalCount
    };
  }

  /**
   * Check if a specific page range is cached
   */
  isPageRangeCached(
    fromDate: string,
    toDate: string,
    companyName: string,
    startPage: number,
    endPage: number,
    pageSize: number,
    searchFilter: string
  ): boolean {
    const baseKey = this.generateCacheKey('sales', { fromDate, toDate, companyName, pageSize, searchFilter });
    const cached = this.paginationCache[baseKey];
    
    if (!cached || Date.now() - cached.lastUpdated > this.CACHE_EXPIRY_MS) {
      return false;
    }

    const startIndex = (startPage - 1) * pageSize;
    const endIndex = endPage * pageSize;
    
    // Check if all items in range are cached
    for (let i = startIndex; i < Math.min(endIndex, cached.totalCount); i++) {
      if (!cached.data[i] || !cached.data[i].id) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get background task if running
   */
  getBackgroundTask<T>(taskKey: string): Promise<T> | null {
    const task = this.backgroundTasks.get(taskKey);
    return task ? (task as Promise<T>) : null;
  }

  /**
   * Set background task
   */
  setBackgroundTask<T>(taskKey: string, task: Promise<T>): void {
    this.backgroundTasks.set(taskKey, task);
    
    // Clean up task when completed
    task.finally(() => {
      this.backgroundTasks.delete(taskKey);
    });
  }

  /**
   * Prefetch adjacent pages for smooth scrolling
   */
  async prefetchAdjacentPages(
    fetchFunction: (page: number) => Promise<PaginatedSalesResponse>,
    currentPage: number,
    totalPages: number
  ): Promise<void> {
    const pagesToPrefetch: number[] = [];
    
    // Prefetch next pages
    for (let i = 1; i <= this.PREFETCH_PAGES; i++) {
      const nextPage = currentPage + i;
      if (nextPage <= totalPages) {
        pagesToPrefetch.push(nextPage);
      }
    }
    
    // Prefetch previous pages
    for (let i = 1; i <= this.PREFETCH_PAGES; i++) {
      const prevPage = currentPage - i;
      if (prevPage >= 1) {
        pagesToPrefetch.push(prevPage);
      }
    }

    // Execute prefetch tasks in background
    const prefetchTasks = pagesToPrefetch.map(page => {
      const taskKey = `prefetch-${page}`;
      
      if (!this.backgroundTasks.has(taskKey)) {
        const task = fetchFunction(page).catch(error => {
          console.warn(`Failed to prefetch page ${page}:`, error);
          return null;
        });
        
        this.setBackgroundTask(taskKey, task);
        return task;
      }
      
      return this.backgroundTasks.get(taskKey);
    });

    // Wait for all prefetch tasks with timeout
    await Promise.allSettled(prefetchTasks);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    this.paginationCache = {};
    this.backgroundTasks.clear();
  }

  /**
   * Clear cache for specific criteria
   */
  clearCacheForCriteria(
    fromDate: string,
    toDate: string,
    companyName: string
  ): void {
    // Clear general cache entries
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(fromDate) && key.includes(toDate) && key.includes(companyName)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));

    // Clear pagination cache
    Object.keys(this.paginationCache).forEach(key => {
      if (key.includes(fromDate) && key.includes(toDate) && key.includes(companyName)) {
        delete this.paginationCache[key];
      }
    });
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): {
    totalEntries: number;
    paginationCacheKeys: number;
    backgroundTasks: number;
    memoryUsage: string;
  } {
    const memoryUsage = JSON.stringify({
      cache: Array.from(this.cache.entries()),
      paginationCache: this.paginationCache
    }).length;

    return {
      totalEntries: this.cache.size,
      paginationCacheKeys: Object.keys(this.paginationCache).length,
      backgroundTasks: this.backgroundTasks.size,
      memoryUsage: `${Math.round(memoryUsage / 1024)} KB`
    };
  }
}

export default SalesCacheService;
