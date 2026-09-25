/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// =============================================================================
// useChildSwitcher — Shared child selection hook for Parent Portal pages
// Manages child list loading, selection, and child-specific data fetching
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { parentApi } from '../../services/api';
import { useSync } from '../../context/SyncContext';

export interface ChildInfo {
  id: string;
  name: string;
  avatar: string;
  class: string;
  code: string;
  gpa: number;
  gpaRank: string;
  classRank: string | number;
  totalStudents: number;
  attendanceRate: string;
  attendanceNote: string;
  recentSubjects: Array<{
    name: string;
    test: string;
    score: number;
    rank: string;
    rankType: string;
  }>;
  isPrimaryContact?: boolean;
  isVerified?: boolean;
  isActive?: boolean;
  relationship?: string;
}

interface UseChildSwitcherReturn {
  children: ChildInfo[];
  selectedChild: ChildInfo | null;
  selectedChildId: string | null;
  isLoading: boolean;
  error: string | null;
  selectChild: (id: string) => void;
  reload: () => void;
}

export function useChildSwitcher(): UseChildSwitcherReturn {
  const { lastSync } = useSync();
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChildren = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await parentApi.getChildrenData<{ children: ChildInfo[] }>();
      if (res?.success && (res as unknown as { children?: ChildInfo[] }).children) {
        const list = (res as unknown as { children: ChildInfo[] }).children;
        setChildren(list);
        // Auto-select primary contact child or first
        if (list.length > 0) {
          const primary = list.find(c => c.isPrimaryContact) || list[0];
          setSelectedChildId(prev => prev || primary.id);
        }
      } else {
        setChildren([]);
        setError('Không có thông tin con cái.');
      }
    } catch (err) {
      setError('Không thể tải danh sách con cái.');
      console.error('[useChildSwitcher] loadChildren error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  // Reload when sync happens
  useEffect(() => {
    if (lastSync) {
      loadChildren();
    }
  }, [lastSync, loadChildren]);

  const selectChild = useCallback((id: string) => {
    setSelectedChildId(id);
  }, []);

  const selectedChild = children.find(c => c.id === selectedChildId) || null;

  return {
    children,
    selectedChild,
    selectedChildId,
    isLoading,
    error,
    selectChild,
    reload: loadChildren,
  };
}
