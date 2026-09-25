/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// =============================================================================
// ChildSwitcher — Shared child selection widget for Parent Portal pages
// Shows avatar pills for each child, click to switch
// =============================================================================

import React from 'react';
import type { ChildInfo } from './useChildSwitcher';

interface ChildSwitcherProps {
  children: ChildInfo[];
  selectedChild: ChildInfo | null;
  onSelect: (id: string) => void;
  semesterLabel?: string;
}

export function ChildSwitcher({
  children,
  selectedChild,
  onSelect,
  semesterLabel = 'Học kỳ I • 2024 - 2025',
}: ChildSwitcherProps) {
  if (children.length === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 hairline-b pb-4">
      <div>
        <div className="text-xs text-text-secondary flex items-center gap-2">
          <span>{semesterLabel}</span>
          {selectedChild?.class && (
            <>
              <span>•</span>
              <span className="text-text-primary font-medium">{selectedChild.class}</span>
            </>
          )}
        </div>
      </div>

      {/* Child Switcher */}
      <div className="flex items-center gap-2 flex-wrap">
        {children.map((child) => {
          const isSelected = child.id === selectedChild?.id;
          return (
            <button
              key={child.id}
              onClick={() => onSelect(child.id)}
              className={`flex items-center gap-2 p-2 px-3 rounded-card border transition-all text-left ${
                isSelected
                  ? 'bg-white border-ocean ring-2 ring-ocean/15 shadow-whisper'
                  : 'bg-surface-neutral border-hairline opacity-75 hover:opacity-100'
              }`}
            >
              <img
                src={child.avatar}
                alt={child.name}
                className="w-8 h-8 rounded-full object-cover border border-hairline"
              />
              <div>
                <div className="text-xs font-semibold text-text-primary">{child.name}</div>
                <div className="text-[11px] text-text-secondary">{child.class}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
