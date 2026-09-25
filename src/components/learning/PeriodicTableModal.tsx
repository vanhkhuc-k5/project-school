// =============================================================================
// PeriodicTableModal — Interactive Periodic Table of Elements
// Features: Color-coded categories, click to view element details
// =============================================================================
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { smartLearningApi, type PeriodicElement } from '../../services/api';
import {
  Loader2,
  X,
  Atom,
  Scale,
  Zap,
  Thermometer,
  Calendar,
  User,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Category Configuration
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  alkali_metal: { bg: 'bg-red-100 hover:bg-red-200', text: 'text-red-800', border: 'border-red-400', label: 'Kim loại kiềm' },
  alkaline_earth: { bg: 'bg-orange-100 hover:bg-orange-200', text: 'text-orange-800', border: 'border-orange-400', label: 'Kim loại kiềm thổ' },
  transition_metal: { bg: 'bg-yellow-100 hover:bg-yellow-200', text: 'text-yellow-800', border: 'border-yellow-400', label: 'Kim loại chuyển tiếp' },
  post_transition_metal: { bg: 'bg-lime-100 hover:bg-lime-200', text: 'text-lime-800', border: 'border-lime-400', label: 'Kim loại sau chuyển tiếp' },
  metalloid: { bg: 'bg-teal-100 hover:bg-teal-200', text: 'text-teal-800', border: 'border-teal-400', label: 'Á kim' },
  nonmetal: { bg: 'bg-green-100 hover:bg-green-200', text: 'text-green-800', border: 'border-green-400', label: 'Phi kim' },
  halogen: { bg: 'bg-emerald-100 hover:bg-emerald-200', text: 'text-emerald-800', border: 'border-emerald-400', label: 'Halogen' },
  noble_gas: { bg: 'bg-purple-100 hover:bg-purple-200', text: 'text-purple-800', border: 'border-purple-400', label: 'Khí hiếm' },
  lanthanide: { bg: 'bg-pink-100 hover:bg-pink-200', text: 'text-pink-800', border: 'border-pink-400', label: 'Lanthanide' },
  actinide: { bg: 'bg-rose-100 hover:bg-rose-200', text: 'text-rose-800', border: 'border-rose-400', label: 'Actinide' },
  unknown: { bg: 'bg-gray-100 hover:bg-gray-200', text: 'text-gray-800', border: 'border-gray-400', label: 'Không xác định' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface PeriodicTableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function PeriodicTableModal({ isOpen, onClose }: PeriodicTableModalProps) {
  const [loading, setLoading] = useState(true);
  const [elements, setElements] = useState<PeriodicElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<PeriodicElement | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Load periodic table data
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      smartLearningApi.getPeriodicTable()
        .then((data) => {
          setElements(data || []);
        })
        .catch((e) => {
          console.error('Failed to load periodic table:', e);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen]);

  // Filter elements by category
  const filteredElements = activeCategory
    ? elements.filter((el) => el.category === activeCategory)
    : elements;

  // Get category counts
  const categoryCounts = elements.reduce((acc, el) => {
    acc[el.category] = (acc[el.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get element by atomic number
  const getElement = (atomicNumber: number) => {
    return elements.find((el) => el.atomic_number === atomicNumber);
  };

  // ── Render ─────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚗️ Bảng Tuần Hoàn Nguyên Tố" size="full">
      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3 text-text-secondary">
          <Loader2 className="w-8 h-8 animate-spin text-ocean" />
          <span className="text-sm">Đang tải bảng tuần hoàn...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 pb-3 border-b border-hairline">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === null
                  ? 'bg-ocean text-white'
                  : 'bg-surface-neutral text-text-secondary hover:bg-gray-200'
              }`}
            >
              Tất cả ({elements.length})
            </button>
            {Object.entries(CATEGORY_STYLES).map(([key, style]) => {
              const count = categoryCounts[key] || 0;
              if (count === 0) return null;
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(activeCategory === key ? null : key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === key
                      ? `${style.bg} ${style.text} ring-2 ring-offset-1 ring-ocean`
                      : `${style.bg} ${style.text}`
                  }`}
                >
                  {style.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Periodic Table Grid (Simplified 18-column view) */}
          <div className="overflow-x-auto pb-4">
            <div className="min-w-[800px]">
              {/* Main Table - Periods 1-7 */}
              <div className="grid grid-cols-18 gap-1 text-xs">
                {/* Row 1: H + He */}
                <div className="col-span-1" />
                <ElementCell element={getElement(1)} onClick={setSelectedElement} />
                <div className="col-span-10" />
                <ElementCell element={getElement(2)} onClick={setSelectedElement} />
                <div className="col-span-6" />

                {/* Row 2: Li-Ne */}
                <ElementCell element={getElement(3)} onClick={setSelectedElement} />
                <ElementCell element={getElement(4)} onClick={setSelectedElement} />
                <div className="col-span-6" />
                <ElementCell element={getElement(5)} onClick={setSelectedElement} />
                <ElementCell element={getElement(6)} onClick={setSelectedElement} />
                <ElementCell element={getElement(7)} onClick={setSelectedElement} />
                <ElementCell element={getElement(8)} onClick={setSelectedElement} />
                <ElementCell element={getElement(9)} onClick={setSelectedElement} />
                <ElementCell element={getElement(10)} onClick={setSelectedElement} />
                <div className="col-span-6" />

                {/* Row 3: Na-Ar */}
                <ElementCell element={getElement(11)} onClick={setSelectedElement} />
                <ElementCell element={getElement(12)} onClick={setSelectedElement} />
                <div className="col-span-6" />
                <ElementCell element={getElement(13)} onClick={setSelectedElement} />
                <ElementCell element={getElement(14)} onClick={setSelectedElement} />
                <ElementCell element={getElement(15)} onClick={setSelectedElement} />
                <ElementCell element={getElement(16)} onClick={setSelectedElement} />
                <ElementCell element={getElement(17)} onClick={setSelectedElement} />
                <ElementCell element={getElement(18)} onClick={setSelectedElement} />
                <div className="col-span-6" />

                {/* Row 4: K-Kr */}
                <ElementCell element={getElement(19)} onClick={setSelectedElement} />
                <ElementCell element={getElement(20)} onClick={setSelectedElement} />
                <div className="col-span-1" />
                <ElementCell element={getElement(1)} onClick={setSelectedElement} small />
                <ElementCell element={getElement(13)} onClick={setSelectedElement} small />
                <ElementCell element={getElement(14)} onClick={setSelectedElement} small />
                <ElementCell element={getElement(15)} onClick={setSelectedElement} small />
                <ElementCell element={getElement(16)} onClick={setSelectedElement} small />
                <ElementCell element={getElement(17)} onClick={setSelectedElement} small />
                <div className="col-span-4" />

                {/* Legend row - Lanthanides */}
                <div className="col-span-2 text-[10px] text-text-secondary flex items-center justify-end pr-2">
                  La-Lu
                </div>
                {Array.from({ length: 15 }, (_, i) => i + 57).map((n) => (
                  <ElementCell key={n} element={getElement(n)} onClick={setSelectedElement} small />
                ))}
                <div className="col-span-1" />

                {/* Legend row - Actinides */}
                <div className="col-span-2 text-[10px] text-text-secondary flex items-center justify-end pr-2">
                  Ac-Lr
                </div>
                {Array.from({ length: 15 }, (_, i) => i + 89).map((n) => (
                  <ElementCell key={n} element={getElement(n)} onClick={setSelectedElement} small />
                ))}
                <div className="col-span-1" />
              </div>

              {/* Selected Element Detail */}
              {selectedElement && (
                <div className="mt-6 p-4 bg-gradient-to-r from-ocean/5 to-primary/5 rounded-xl border border-ocean/20">
                  <div className="flex items-start gap-6">
                    {/* Element Symbol */}
                    <div className={`w-24 h-24 rounded-xl border-2 flex flex-col items-center justify-center ${CATEGORY_STYLES[selectedElement.category]?.border || 'border-gray-300'} ${CATEGORY_STYLES[selectedElement.category]?.bg || 'bg-gray-100'}`}>
                      <span className="text-[10px] text-text-secondary">{selectedElement.atomic_number}</span>
                      <span className="text-2xl font-bold">{selectedElement.symbol}</span>
                      <span className="text-[10px] text-text-secondary">{(selectedElement.atomic_mass || 0).toFixed(3)}</span>
                    </div>

                    {/* Element Info */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="text-lg font-bold text-text-primary">{selectedElement.name}</h3>
                        <p className="text-sm text-text-secondary">{selectedElement.name_vietnamese || selectedElement.name}</p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <InfoCard icon={Atom} label="Số hiệu" value={selectedElement.atomic_number} />
                        <InfoCard icon={Scale} label="Nguyên tử khối" value={(selectedElement.atomic_mass || 0).toFixed(3)} />
                        {selectedElement.electron_configuration && (
                          <InfoCard icon={Zap} label="Cấu hình e" value={selectedElement.electron_configuration} />
                        )}
                        {selectedElement.group && (
                          <InfoCard icon={Calendar} label="Nhóm" value={selectedElement.group} />
                        )}
                      </div>

                      {selectedElement.description && (
                        <p className="text-xs text-text-secondary">{selectedElement.description}</p>
                      )}
                    </div>

                    {/* Close Button */}
                    <button
                      onClick={() => setSelectedElement(null)}
                      className="p-1.5 rounded-full hover:bg-surface-neutral"
                    >
                      <X className="w-5 h-5 text-text-secondary" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-hairline">
            {Object.entries(CATEGORY_STYLES).map(([key, style]) => {
              if (!categoryCounts[key]) return null;
              return (
                <div key={key} className={`flex items-center gap-1.5 px-2 py-1 rounded ${style.bg}`}>
                  <div className={`w-3 h-3 rounded-sm ${style.border} border-2`} />
                  <span className={`text-[10px] font-medium ${style.text}`}>{style.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────────────────────

interface ElementCellProps {
  element: PeriodicElement | undefined;
  onClick: (el: PeriodicElement) => void;
  small?: boolean;
}

function ElementCell({ element, onClick, small }: ElementCellProps) {
  if (!element) {
    return <div className="aspect-square" />;
  }

  const style = CATEGORY_STYLES[element.category] || CATEGORY_STYLES.unknown;

  return (
    <button
      onClick={() => onClick(element)}
      className={`aspect-square rounded flex flex-col items-center justify-center transition-all ${style.bg} ${style.text} hover:scale-110 hover:shadow-md ${small ? 'p-0.5' : 'p-1'}`}
      title={`${element.name} (${element.symbol})`}
    >
      <span className={`${small ? 'text-[8px]' : 'text-[10px]'} opacity-70`}>
        {element.atomic_number}
      </span>
      <span className={`font-bold ${small ? 'text-[10px]' : 'text-sm'}`}>
        {element.symbol}
      </span>
      {small && <span className="text-[6px] opacity-60">{element.name_vietnamese?.slice(0, 4)}</span>}
    </button>
  );
}

interface InfoCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}

function InfoCard({ icon: Icon, label, value }: InfoCardProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
      <Icon className="w-4 h-4 text-ocean shrink-0" />
      <div>
        <div className="text-[10px] text-text-secondary">{label}</div>
        <div className="text-xs font-medium text-text-primary font-mono">{value}</div>
      </div>
    </div>
  );
}
