'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Filter, ChevronDown, ChevronUp, Check, Search } from 'lucide-react';

interface MaterialType {
  id: number;
  type_name: string;
  description?: string;
}

interface MaterialFilterProps {
  materialTypes: MaterialType[];
  filterType: number[];
  filterWHSE: string;
  filterUnit: string;
  filterPriceMin: number | null;
  filterPriceMax: number | null;
  onFilterTypeChange: (types: number[]) => void;
  onFilterWHSEChange: (whse: string) => void;
  onFilterUnitChange: (unit: string) => void;
  onFilterPriceMinChange: (price: number | null) => void;
  onFilterPriceMaxChange: (price: number | null) => void;
  onApply: () => void;
  onClearAll: () => void;
  hideToggle?: boolean;
  isOpen?: boolean;
}

export default function MaterialFilter({
  materialTypes,
  filterType,
  filterWHSE,
  filterUnit,
  filterPriceMin,
  filterPriceMax,
  onFilterTypeChange,
  onFilterWHSEChange,
  onFilterUnitChange,
  onFilterPriceMinChange,
  onFilterPriceMaxChange,
  onApply,
  onClearAll,
  hideToggle = false,
  isOpen: controlledIsOpen,
}: MaterialFilterProps) {
  const internalOpen = controlledIsOpen === undefined ? !hideToggle : controlledIsOpen;
  const [isOpen, setIsOpen] = useState(internalOpen);
  const [localWHSE, setLocalWHSE] = useState(filterWHSE);
  const [localUnit, setLocalUnit] = useState(filterUnit);
  const [localPriceMin, setLocalPriceMin] = useState(filterPriceMin?.toString() || '');
  const [localPriceMax, setLocalPriceMax] = useState(filterPriceMax?.toString() || '');
  const [localTypes, setLocalTypes] = useState<number[]>(filterType);
  const [typeSearchQuery, setTypeSearchQuery] = useState('');
  const [isAnimating, setIsAnimating] = useState(internalOpen);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync when props change from external (e.g., clear all badges)
  useEffect(() => {
    setLocalTypes(filterType);
    setLocalWHSE(filterWHSE);
    setLocalUnit(filterUnit);
    setLocalPriceMin(filterPriceMin?.toString() || '');
    setLocalPriceMax(filterPriceMax?.toString() || '');

    // Sync open state when controlled from parent
    if (controlledIsOpen !== undefined) {
      if (controlledIsOpen) {
        setIsOpen(true);
        // Small delay to trigger animation
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      } else {
        setIsAnimating(false);
        setTimeout(() => setIsOpen(false), 200);
      }
    }
  }, [filterType, filterWHSE, filterUnit, filterPriceMin, filterPriceMax, controlledIsOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => setIsAnimating(true), 10);
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => setIsOpen(false), 200);
  };

  const handleToggle = () => {
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  };

  const handleApply = () => {
    onFilterTypeChange(localTypes);
    onFilterWHSEChange(localWHSE);
    onFilterUnitChange(localUnit);
    onFilterPriceMinChange(localPriceMin ? parseFloat(localPriceMin) : null);
    onFilterPriceMaxChange(localPriceMax ? parseFloat(localPriceMax) : null);
    onApply();
    handleClose();
  };

  const handleClearAll = () => {
    setLocalTypes([]);
    setLocalWHSE('');
    setLocalUnit('');
    setLocalPriceMin('');
    setLocalPriceMax('');
    onClearAll();
    handleClose();
  };

  const handleTypeToggle = (typeId: number) => {
    setLocalTypes((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]
    );
  };

  // Filter material types based on search query
  const filteredMaterialTypes = materialTypes.filter((type) =>
    type.type_name.toLowerCase().includes(typeSearchQuery.toLowerCase()) ||
    (type.description || '').toLowerCase().includes(typeSearchQuery.toLowerCase())
  );

  const handleClearTypeSearch = () => {
    setTypeSearchQuery('');
  };

  const hasActiveFilters = filterType.length > 0 || filterWHSE || filterUnit || filterPriceMin !== null || filterPriceMax !== null;
  const hasLocalChanges = localTypes.length > 0 || localWHSE || localUnit || localPriceMin || localPriceMax;

  // Count active filter categories
  const activeFilterCount = 
    (filterType.length > 0 ? 1 : 0) + 
    (filterWHSE ? 1 : 0) + 
    (filterUnit ? 1 : 0) + 
    (filterPriceMin !== null || filterPriceMax !== null ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Filter Toggle Button & Active Badges */}
      {!hideToggle && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleToggle}
            className={`group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 transition-all duration-200 font-medium text-sm ${
              hasActiveFilters
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm hover:bg-indigo-100'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${hasActiveFilters ? 'bg-indigo-500' : 'bg-gray-400 group-hover:bg-gray-500'}`}>
              <Filter className="w-3.5 h-3.5 text-white" />
            </div>
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold bg-indigo-600 text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
            <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </div>
          </button>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <span className="text-sm text-gray-500 font-medium">Active:</span>
            {filterType.map((typeId) => {
              const type = materialTypes.find((t) => t.id === typeId);
              return (
                <span
                  key={typeId}
                  className="group/badge inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded-full border border-indigo-200"
                >
                  <span className="text-xs font-semibold text-indigo-600">Type</span>
                  <span>{type?.type_name || 'Unknown'}</span>
                  <button
                    onClick={() => {
                      const newTypes = filterType.filter((id) => id !== typeId);
                      onFilterTypeChange(newTypes);
                      setLocalTypes(newTypes);
                    }}
                    className="p-0.5 rounded-full hover:bg-indigo-200 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {filterWHSE && (
              <span className="group/badge inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-emerald-100 text-emerald-800 text-sm font-medium rounded-full border border-emerald-200">
                <span className="text-xs font-semibold text-emerald-600">WHSE</span>
                <span>{filterWHSE}</span>
                <button
                  onClick={() => {
                    onFilterWHSEChange('');
                    setLocalWHSE('');
                  }}
                  className="p-0.5 rounded-full hover:bg-emerald-200 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterUnit && (
              <span className="group/badge inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-violet-100 text-violet-800 text-sm font-medium rounded-full border border-violet-200">
                <span className="text-xs font-semibold text-violet-600">Unit</span>
                <span>{filterUnit}</span>
                <button
                  onClick={() => {
                    onFilterUnitChange('');
                    setLocalUnit('');
                  }}
                  className="p-0.5 rounded-full hover:bg-violet-200 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(filterPriceMin !== null || filterPriceMax !== null) && (
              <span className="group/badge inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full border border-amber-200">
                <span className="text-xs font-semibold text-amber-600">Price</span>
                <span>${filterPriceMin ?? '0'} – {filterPriceMax ?? '∞'}</span>
                <button
                  onClick={() => {
                    onFilterPriceMinChange(null);
                    onFilterPriceMaxChange(null);
                    setLocalPriceMin('');
                    setLocalPriceMax('');
                  }}
                  className="p-0.5 rounded-full hover:bg-amber-200 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
        </div>
      )}

      {/* Filter Panel */}
      <div
        ref={panelRef}
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isOpen && isAnimating ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
          {/* Panel Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Filter className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Advanced Filters</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {hasLocalChanges ? `${localTypes.length} type${localTypes.length !== 1 ? 's' : ''} selected` + 
                    (localWHSE || localUnit || localPriceMin || localPriceMax ? ' • ' : '') +
                    (localWHSE ? 'WH' : '') + (localWHSE && localUnit ? ', ' : '') + 
                    (localUnit ? 'Unit' : '') + (localPriceMin || localPriceMax ? ' • Price range' : '')
                    : 'Set filters to narrow results'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Content */}
          <div className="p-6 space-y-6">
            {/* Material Type Multi-select */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  Material Type
                  {localTypes.length > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-full">
                      {localTypes.length}
                    </span>
                  )}
                </label>
                {localTypes.length > 0 && (
                  <button
                    onClick={() => setLocalTypes([])}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
                  >
                    Clear types
                  </button>
                )}
              </div>
              
              {/* Search Input */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={typeSearchQuery}
                  onChange={(e) => setTypeSearchQuery(e.target.value)}
                  placeholder="Search material types..."
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all hover:border-gray-400"
                />
                {typeSearchQuery && (
                  <button
                    onClick={handleClearTypeSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="border border-gray-200 rounded-xl bg-gray-50/50 max-h-48 overflow-y-auto scrollbar-thin">
                {materialTypes.length === 0 ? (
                  <div className="p-6 text-sm text-gray-500 text-center">
                    No material types available
                  </div>
                ) : filteredMaterialTypes.length === 0 ? (
                  <div className="p-6 text-sm text-gray-500 text-center">
                    No matching types found
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredMaterialTypes.map((type) => {
                      const isSelected = localTypes.includes(type.id);
                      return (
                        <label
                          key={type.id}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/70' : 'hover:bg-white'
                          }`}
                        >
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleTypeToggle(type.id)}
                              className="peer w-4 h-4 appearance-none border-2 border-gray-300 rounded-md checked:border-indigo-500 checked:bg-indigo-500 transition-all cursor-pointer"
                            />
                            <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none top-0.5 left-0.5" strokeWidth={3} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                              {type.type_name}
                            </div>
                            {type.description && (
                              <div className="text-xs text-gray-500 truncate mt-0.5">
                                {type.description}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* WHSE */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Warehouse (WHSE)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={localWHSE}
                    onChange={(e) => setLocalWHSE(e.target.value)}
                    placeholder="e.g., WH-01"
                    className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all hover:border-gray-400"
                  />
                  {localWHSE && (
                    <button
                      onClick={() => setLocalWHSE('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Unit */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Unit of Measure
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={localUnit}
                    onChange={(e) => setLocalUnit(e.target.value)}
                    placeholder="e.g., pcs, kg, m"
                    className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all hover:border-gray-400"
                  />
                  {localUnit && (
                    <button
                      onClick={() => setLocalUnit('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Unit Price Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={localPriceMin}
                    onChange={(e) => setLocalPriceMin(e.target.value)}
                    placeholder="Min"
                    min="0"
                    step="0.01"
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all hover:border-gray-400"
                  />
                  <span className="text-gray-400 font-medium">→</span>
                  <input
                    type="number"
                    value={localPriceMax}
                    onChange={(e) => setLocalPriceMax(e.target.value)}
                    placeholder="Max"
                    min="0"
                    step="0.01"
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all hover:border-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Panel Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={handleClearAll}
              disabled={!hasLocalChanges}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm hover:border-gray-400"
            >
              Reset All
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-5 py-2.5 text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-all font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={!hasLocalChanges}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm shadow-sm hover:shadow-md disabled:hover:shadow-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
