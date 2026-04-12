'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { materialApi, materialTypeApi } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Plus, Edit, Trash2, X, Package, FileSpreadsheet, Filter } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { MaterialType } from '@/types';
import ImportModal from '@/components/ImportModal';
import MaterialFilter from '@/components/MaterialFilter';
import { ChevronDown } from 'lucide-react';

const materialSchema = z.object({
  material_code: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  material_type_ids: z.array(z.number()).default([]),
  remarks: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  unit_price: z.coerce.number().min(0, 'Unit price must be 0 or greater'),
  whse: z.string().optional(),
});

const materialTypeSchema = z.object({
  type_name: z.string().min(1, 'Type name is required'),
  description: z.string().optional(),
});

type MaterialFormData = z.infer<typeof materialSchema>;
type MaterialTypeFormData = z.infer<typeof materialTypeSchema>;

export default function MaterialPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'materials' | 'types'>('materials');
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  // Filter states
  const [showFilter, setShowFilter] = useState(false);
  const [filterType, setFilterType] = useState<number[]>([]);
  const [filterWHSE, setFilterWHSE] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterPriceMin, setFilterPriceMin] = useState<number | null>(null);
  const [filterPriceMax, setFilterPriceMax] = useState<number | null>(null);

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [typeSearchQuery, setTypeSearchQuery] = useState('');

  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: () => materialApi.getAll().then((res) => res.data.data),
  });

  const { data: materialTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['material-types'],
    queryFn: () => materialTypeApi.getAll().then((res) => res.data.data),
  });

  const hasActiveFilters = filterType.length > 0 || filterWHSE || filterUnit || filterPriceMin !== null || filterPriceMax !== null;
  const activeFilterCount = 
    (filterType.length > 0 ? 1 : 0) + 
    (filterWHSE ? 1 : 0) + 
    (filterUnit ? 1 : 0) + 
    (filterPriceMin !== null || filterPriceMax !== null ? 1 : 0);

  const filteredMaterials = materials?.filter((material: any) => {
    // Search query filter
    const matchSearch = !searchQuery ||
      material.material_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (material.remarks || '').toLowerCase().includes(searchQuery.toLowerCase());

    // Type filter - match if material has ANY of the selected types
    const matchType = filterType.length === 0 ||
      (material.material_type_ids && material.material_type_ids.some((id: number) => filterType.includes(id)));

    // WHSE filter
    const matchWHSE = !filterWHSE ||
      (material.whse || '').toLowerCase().includes(filterWHSE.toLowerCase());

    // Unit filter
    const matchUnit = !filterUnit ||
      (material.unit || '').toLowerCase().includes(filterUnit.toLowerCase());

    // Price range filter
    const matchPriceMin = filterPriceMin === null ||
      (material.unit_price ?? 0) >= filterPriceMin;
    const matchPriceMax = filterPriceMax === null ||
      (material.unit_price ?? 0) <= filterPriceMax;

    return matchSearch && matchType && matchWHSE && matchUnit && matchPriceMin && matchPriceMax;
  });

  const createMutation = useMutation({
    mutationFn: (data: MaterialFormData) => materialApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setShowModal(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: MaterialFormData) =>
      materialApi.update(editingMaterial.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setShowModal(false);
      setEditingMaterial(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => materialApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });

  const filteredTypes = materialTypes?.filter((type: MaterialType) =>
    type.type_name.toLowerCase().includes(typeSearchQuery.toLowerCase()) ||
    (type.description || '').toLowerCase().includes(typeSearchQuery.toLowerCase())
  );

  const typeCreateMutation = useMutation({
    mutationFn: (data: MaterialTypeFormData) => materialTypeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-types'] });
      setShowTypeModal(false);
      resetTypeForm();
    },
  });

  const typeUpdateMutation = useMutation({
    mutationFn: (data: MaterialTypeFormData) =>
      materialTypeApi.update(editingType.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-types'] });
      setShowTypeModal(false);
      setEditingType(null);
      resetTypeForm();
    },
  });

  const typeDeleteMutation = useMutation({
    mutationFn: (id: number) => materialTypeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-types'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      material_code: '',
      description: '',
      material_type_ids: [],
      remarks: '',
      unit: '',
      unit_price: 0,
      whse: '',
    },
  });

  const resetForm = () => {
    reset({
      material_code: '',
      description: '',
      material_type_ids: [],
      remarks: '',
      unit: '',
      unit_price: 0,
      whse: '',
    });
  };

  const handleEdit = (material: any) => {
    setEditingMaterial(material);
    reset({
      material_code: material.material_code,
      description: material.description,
      material_type_ids: material.material_type_ids || [],
      remarks: material.remarks || '',
      unit: material.unit,
      unit_price: material.unit_price || 0,
      whse: material.whse || '',
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this material?')) {
      deleteMutation.mutate(id);
    }
  };

  const {
    register: registerType,
    handleSubmit: handleSubmitType,
    reset: resetType,
    formState: { errors: typeErrors },
  } = useForm({
    resolver: zodResolver(materialTypeSchema),
    defaultValues: {
      type_name: '',
      description: '',
    },
  });

  const resetTypeForm = () => {
    resetType({
      type_name: '',
      description: '',
    });
  };

  const handleTypeEdit = (type: MaterialType) => {
    setEditingType(type);
    resetType({
      type_name: type.type_name,
      description: type.description || '',
    });
    setShowTypeModal(true);
  };

  const handleTypeDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this material type?')) {
      typeDeleteMutation.mutate(id);
    }
  };

  const onTypeSubmit = (data: MaterialTypeFormData) => {
    if (editingType) {
      typeUpdateMutation.mutate(data);
    } else {
      typeCreateMutation.mutate(data);
    }
  };

  const onSubmit = (data: MaterialFormData) => {
    // Convert empty material_code to undefined so backend will auto-generate it
    const submitData = {
      ...data,
      material_code: data.material_code === '' ? undefined : data.material_code,
      material_type_ids: data.material_type_ids || [],
    };

    if (editingMaterial) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Materials</h1>
          {activeTab === 'materials' && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium focus:ring-2 focus:ring-green-500 focus:ring-offset-2 active:scale-95"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span>Import Excel</span>
              </button>
              <button
                onClick={() => {
                  setEditingMaterial(null);
                  resetForm();
                  setShowModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                <span>New Material</span>
              </button>
            </div>
          )}
          {activeTab === 'types' && (
            <button
              onClick={() => {
                setEditingType(null);
                resetTypeForm();
                setShowTypeModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span>New Type</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('materials')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'materials'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Materials
            </button>
            <button
              onClick={() => setActiveTab('types')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'types'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Material Types
            </button>
          </nav>
        </div>

        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <>
            {/* Search + Filter Unified Container */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Top bar: Search + Filter button */}
              <div className="flex items-center gap-3 p-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by code, description, or remarks..."
                  className="flex-1 min-w-0 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:border-gray-400 text-sm"
                />
                <button
                  onClick={() => setShowFilter(!showFilter)}
                  className={`flex-shrink-0 group inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all duration-200 font-medium text-sm ${
                    hasActiveFilters
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className={`p-1.5 rounded-md transition-colors ${hasActiveFilters ? 'bg-indigo-500' : 'bg-gray-400 group-hover:bg-gray-500'}`}>
                    <Filter className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span>Filters</span>
                  {hasActiveFilters && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold bg-indigo-600 text-white rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                  <div className={`transition-transform duration-200 ${showFilter ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>
              </div>

              {/* Active Filter Badges */}
              {hasActiveFilters && (
                <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 font-medium">Active:</span>
                  {filterType.map((typeId) => {
                    const type = materialTypes?.find((t: MaterialType) => t.id === typeId);
                    return (
                      <span
                        key={typeId}
                        className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full border border-indigo-200"
                      >
                        <span className="text-xs font-semibold text-indigo-600">Type</span>
                        <span>{type?.type_name || 'Unknown'}</span>
                        <button
                          onClick={() => setFilterType(filterType.filter((id) => id !== typeId))}
                          className="p-0.5 rounded-full hover:bg-indigo-200 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {filterWHSE && (
                    <span className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-full border border-emerald-200">
                      <span className="text-xs font-semibold text-emerald-600">WHSE</span>
                      <span>{filterWHSE}</span>
                      <button
                        onClick={() => setFilterWHSE('')}
                        className="p-0.5 rounded-full hover:bg-emerald-200 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filterUnit && (
                    <span className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-violet-100 text-violet-800 text-xs font-medium rounded-full border border-violet-200">
                      <span className="text-xs font-semibold text-violet-600">Unit</span>
                      <span>{filterUnit}</span>
                      <button
                        onClick={() => setFilterUnit('')}
                        className="p-0.5 rounded-full hover:bg-violet-200 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {(filterPriceMin !== null || filterPriceMax !== null) && (
                    <span className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full border border-amber-200">
                      <span className="text-xs font-semibold text-amber-600">Price</span>
                      <span>${filterPriceMin ?? '0'} – {filterPriceMax ?? '∞'}</span>
                      <button
                        onClick={() => {
                          setFilterPriceMin(null);
                          setFilterPriceMax(null);
                        }}
                        className="p-0.5 rounded-full hover:bg-amber-200 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}

              {/* Filter Panel (inside container) */}
              <div className={showFilter ? 'border-t border-gray-200' : ''}>
                <MaterialFilter
                  materialTypes={materialTypes || []}
                  filterType={filterType}
                  filterWHSE={filterWHSE}
                  filterUnit={filterUnit}
                  filterPriceMin={filterPriceMin}
                  filterPriceMax={filterPriceMax}
                  onFilterTypeChange={setFilterType}
                  onFilterWHSEChange={setFilterWHSE}
                  onFilterUnitChange={setFilterUnit}
                  onFilterPriceMinChange={setFilterPriceMin}
                  onFilterPriceMaxChange={setFilterPriceMax}
                  onApply={() => {}}
                  onClearAll={() => {
                    setFilterType([]);
                    setFilterWHSE('');
                    setFilterUnit('');
                    setFilterPriceMin(null);
                    setFilterPriceMax(null);
                  }}
                  hideToggle={true}
                  isOpen={showFilter}
                />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-3 bg-gray-200 rounded w-48"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                          Code
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell w-48">
                          Remarks
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          Unit
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell w-28">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell w-24">
                          WHSE
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredMaterials?.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-6 py-8 text-center text-gray-600"
                          >
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                <Package className="w-8 h-8 text-gray-400" />
                              </div>
                              <p className="font-medium">{searchQuery ? 'No materials found matching your search' : 'No materials found'}</p>
                              <p className="text-sm text-gray-500">{searchQuery ? 'Try a different search term' : 'Add your first material to get started'}</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredMaterials?.map((material: any) => (
                          <tr key={material.id} className="hover:bg-gray-50 transition-colors align-top">
                            <td className="px-4 py-4 text-sm font-mono text-gray-900 w-32 whitespace-nowrap">
                              {material.material_code}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-700 w-40">
                              {material.material_types && material.material_types.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {material.material_types.map((type: MaterialType) => (
                                    <span
                                      key={type.id}
                                      className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded"
                                    >
                                      {type.type_name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              <div className="whitespace-normal break-words line-clamp-3" title={material.description}>
                                {material.description}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-700 hidden lg:table-cell w-48">
                              <div className="whitespace-nowrap truncate max-w-full" title={material.remarks || undefined}>
                                {material.remarks || '-'}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm w-20">
                              <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                                {material.unit}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell w-28">
                              {material.unit_price ? `$${Number(material.unit_price).toFixed(2)}` : '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell w-24">
                              {material.whse || '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right w-24">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleEdit(material)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition focus:ring-2 focus:ring-blue-500"
                                  aria-label="Edit material"
                                >
                                  <Edit className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(material.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition focus:ring-2 focus:ring-red-500"
                                  aria-label="Delete material"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Material Types Tab */}
        {activeTab === 'types' && (
          <>
            {/* Search */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <input
                type="text"
                value={typeSearchQuery}
                onChange={(e) => setTypeSearchQuery(e.target.value)}
                placeholder="Search by type name or description..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:border-gray-400"
              />
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {typesLoading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-3 bg-gray-200 rounded w-48"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTypes?.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-6 py-8 text-center text-gray-600"
                          >
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                <Package className="w-8 h-8 text-gray-400" />
                              </div>
                              <p className="font-medium">{typeSearchQuery ? 'No material types found matching your search' : 'No material types found'}</p>
                              <p className="text-sm text-gray-500">{typeSearchQuery ? 'Try a different search term' : 'Add your first material type to get started'}</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredTypes?.map((type: MaterialType) => (
                          <tr key={type.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {type.type_name}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                              {type.description || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleTypeEdit(type)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition focus:ring-2 focus:ring-blue-500"
                                  aria-label="Edit material type"
                                >
                                  <Edit className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleTypeDelete(type.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition focus:ring-2 focus:ring-red-500"
                                  aria-label="Delete material type"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Material Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => { setShowModal(false); setEditingMaterial(null); resetForm(); }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingMaterial ? 'Edit Material' : 'New Material'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingMaterial(null);
                  resetForm();
                }}
                className="p-1 hover:bg-gray-100 rounded transition"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Material Code <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  {...register('material_code')}
                  placeholder="Auto-generated if empty"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:border-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  {...register('description')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:border-gray-400"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Material Types
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto bg-white">
                  {materialTypes && materialTypes.length > 0 ? (
                    <div className="space-y-2">
                      {materialTypes.map((type: MaterialType) => {
                        const typeIds = (watch('material_type_ids') as number[]) || [];
                        const isSelected = typeIds.includes(type.id);
                        return (
                          <label
                            key={type.id}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const currentIds = (watch('material_type_ids') as number[]) || [];
                                const newIds = e.target.checked
                                  ? [...currentIds, type.id]
                                  : currentIds.filter((id: number) => id !== type.id);
                                setValue('material_type_ids', newIds, { shouldValidate: true, shouldDirty: true });
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-sm text-gray-900">{type.type_name}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No material types available</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks
                </label>
                <textarea
                  {...register('remarks')}
                  rows={3}
                  placeholder="Enter material remarks (optional)"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:border-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit *
                </label>
                <input
                  type="text"
                  {...register('unit')}
                  placeholder="e.g., pcs, kg, m, liter"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:border-gray-400"
                />
                {errors.unit && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.unit.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('unit_price')}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:border-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WHSE
                  </label>
                  <input
                    type="text"
                    {...register('whse')}
                    placeholder="e.g., WH-01"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:border-gray-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingMaterial(null);
                    resetForm();
                  }}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingMaterial
                    ? 'Update'
                    : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => { setShowTypeModal(false); setEditingType(null); resetTypeForm(); }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingType ? 'Edit Material Type' : 'New Material Type'}
              </h2>
              <button
                onClick={() => {
                  setShowTypeModal(false);
                  setEditingType(null);
                  resetTypeForm();
                }}
                className="p-1 hover:bg-gray-100 rounded transition"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSubmitType(onTypeSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type Name *
                </label>
                <input
                  type="text"
                  {...registerType('type_name')}
                  placeholder="e.g., Steel, Copper, Plastic"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:border-gray-400"
                />
                {typeErrors.type_name && (
                  <p className="mt-1 text-sm text-red-600">
                    {typeErrors.type_name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...registerType('description')}
                  rows={3}
                  placeholder="Enter type description (optional)"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:border-gray-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTypeModal(false);
                    setEditingType(null);
                    resetTypeForm();
                  }}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    typeCreateMutation.isPending || typeUpdateMutation.isPending
                  }
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95"
                >
                  {typeCreateMutation.isPending || typeUpdateMutation.isPending
                    ? 'Saving...'
                    : editingType
                    ? 'Update'
                    : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['materials'] });
        }}
      />
    </DashboardLayout>
  );
}
