// =============================================================================
// Cache Manager — G40 Frontend Data Layer
// Simple in-memory cache with TTL support
// =============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// =============================================
// Simple In-Memory Cache
// =============================================

class CacheManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start cleanup interval (every 1 minute)
    if (typeof window !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
    }
  }

  // Get item from cache
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  // Set item in cache
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  // Check if key exists and is valid
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // Delete specific key
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // Invalidate by prefix (e.g., 'student:' invalidates all student keys)
  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  // Invalidate by pattern (e.g., 'student/assignments')
  invalidateByPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Destroy cleanup interval
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
export const apiCache = new CacheManager();

// =============================================
// Cache Keys Builder
// =============================================

export const CacheKeys = {
  // Auth
  auth: () => 'auth:user',
  
  // Student
  student: {
    dashboard: () => 'student:dashboard',
    assignments: () => 'student:assignments',
    grades: () => 'student:grades',
    attendance: () => 'student:attendance',
    timetable: () => 'student:timetable',
    announcements: () => 'student:announcements',
    announcementsById: (id: string) => `student:announcements:${id}`,
  },
  
  // Teacher
  teacher: {
    dashboard: () => 'teacher:dashboard',
    classes: () => 'teacher:classes',
    assignments: () => 'teacher:assignments',
    schedule: () => 'teacher:schedule',
    analytics: (classId?: string) => classId ? `teacher:analytics:${classId}` : 'teacher:analytics',
  },
  
  // Parent
  parent: {
    dashboard: (studentId?: string) => studentId ? `parent:dashboard:${studentId}` : 'parent:dashboard',
    children: () => 'parent:children',
    grades: (studentId: string) => `parent:grades:${studentId}`,
    tuition: (studentId: string) => `parent:tuition:${studentId}`,
    announcements: () => 'parent:announcements',
  },
  
  // Admin
  admin: {
    dashboard: () => 'admin:dashboard',
    overview: () => 'admin:overview',
    users: (role?: string) => role ? `admin:users:${role}` : 'admin:users',
    classes: () => 'admin:classes',
    subjects: () => 'admin:subjects',
    announcements: () => 'admin:announcements',
    announcementsById: (id: string) => `admin:announcements:${id}`,
  },
  
  // Common
  common: {
    schools: () => 'common:schools',
    academicYears: () => 'common:academicYears',
  },
};

// =============================================
// Cache Invalidation Helpers
// =============================================

export const CacheInvalidation = {
  // When user logs in or out
  onAuthChange(): void {
    apiCache.clear();
  },
  
  // When student data changes
  onStudentUpdate(studentId?: string): void {
    apiCache.invalidateByPrefix('student:');
    if (studentId) {
      apiCache.invalidateByPrefix(`parent:grades:${studentId}`);
      apiCache.invalidateByPrefix(`parent:dashboard:${studentId}`);
    }
  },
  
  // When assignment changes
  onAssignmentChange(): void {
    apiCache.invalidateByPrefix('student:assignments');
    apiCache.invalidateByPrefix('teacher:assignments');
  },
  
  // When grades change
  onGradeChange(): void {
    apiCache.invalidateByPrefix('student:grades');
    apiCache.invalidateByPrefix('teacher:');
    apiCache.invalidateByPrefix('parent:grades');
    apiCache.invalidateByPrefix('admin:');
  },
  
  // When announcement changes
  onAnnouncementChange(): void {
    apiCache.invalidateByPrefix('student:announcements');
    apiCache.invalidateByPrefix('teacher:announcements');
    apiCache.invalidateByPrefix('parent:announcements');
    apiCache.invalidateByPrefix('admin:announcements');
  },
  
  // When class structure changes
  onClassChange(): void {
    apiCache.invalidateByPrefix('teacher:classes');
    apiCache.invalidateByPrefix('admin:classes');
    apiCache.invalidateByPrefix('student:');
    apiCache.invalidateByPrefix('parent:');
  },
};

// =============================================
// Cache TTL Constants
// =============================================

export const CacheTTL = {
  // Short-lived data (1 minute)
  SHORT: 60 * 1000,
  
  // Medium-lived data (5 minutes)
  MEDIUM: 5 * 60 * 1000,
  
  // Long-lived data (15 minutes)
  LONG: 15 * 60 * 1000,
  
  // User-specific data (30 seconds - sensitive)
  USER_DATA: 30 * 1000,
  
  // Static/reference data (1 hour)
  STATIC: 60 * 60 * 1000,
};

export default apiCache;
