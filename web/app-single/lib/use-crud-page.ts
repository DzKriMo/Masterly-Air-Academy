"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useTranslation } from "@/lib/use-translation";
import { useToast } from "@/components/toast";
import { api, unwrapResults, withFullLimit } from "@/lib/api";
import type { Column } from "@/components/data-table";

// ── Shared types ────────────────────────────────────────

export interface CrudOption {
  value: string;
  label: string;
}

export type CrudLookups = Record<string, any[]>;

export type CrudOptions = CrudOption[] | ((lookups: CrudLookups) => CrudOption[]);

export interface CrudField {
  name: string;
  label: string;
  type: "text" | "select" | "multiselect" | "textarea" | "datetime" | "date" | "time" | "checkbox" | "file" | "custom";
  span?: "full" | "half";
  required?: boolean;
  requiredForSubmit?: boolean;
  placeholder?: string;
  mono?: boolean;
  options?: CrudOptions;
  rows?: number;
  uploadEndpoint?: string;
  accept?: string;
  uploadErrorKey?: string;
  uploadErrorFallback?: string;
  uploadSuccessKey?: string;
  uploadSuccessFallback?: string;
  /** Custom renderer (used with type "custom"). */
  render?: (value: any, onChange: (v: any) => void, lookups: CrudLookups, form: CrudForm) => React.ReactNode;
}

export interface CrudFilterField {
  key: string;
  label: string;
  options: CrudOptions;
}

export type CrudToast = string | { key: string; fallback: string };

export interface CrudLookup {
  key: string;
  queryKey: string[];
  endpoint: string;
}

export type CrudTranslate = (key: string, fallback?: string) => string;

export interface CrudActions {
  onEdit: () => void;
  onDelete: () => void;
  t: CrudTranslate;
}

export type CrudForm = Record<string, any>;

export interface CrudPageConfig<T> {
  queryKey: string[];
  endpoint: string;

  fields?: CrudField[] | ((mode: "create" | "edit") => CrudField[]);
  initialCreate?: CrudForm;
  buildForm?: (item: T) => CrudForm;
  buildPayload?: (form: CrudForm) => any;
  createPayload?: (form: CrudForm) => any;
  updatePayload?: (form: CrudForm) => any;

  columns: Column<T>[];
  renderActions?: (item: T, actions: CrudActions) => React.ReactNode;

  filterFields?: CrudFilterField[];
  searchFields?: string[];
  searchPlaceholder?: string;
  showFilterBar?: boolean;

  detailFields?: (item: T) => { label: string; value: string }[];
  detailTitle?: string;
  showDetailModal?: boolean;
  detailExtra?: (item: T) => React.ReactNode;

  createTitle?: string;
  editTitle?: string;

  deleteTitle?: string;
  deleteMessage?: string;

  titleKey?: string;
  titleFallback: string;
  backHref?: string;
  backLabelKey?: string;
  backLabelFallback?: string;
  createLabel?: string;

  emptyTitle: string;
  emptyMessage: string;
  emptyActionLabel?: string;

  errorFallback?: string;
  formErrorFallback?: string;
  deleteErrorFallback?: string;

  toasts?: { create?: CrudToast; update?: CrudToast; delete?: CrudToast };

  lookup?: CrudLookup;
  lookups?: CrudLookup[];

  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  pageSize?: number;

  /** Optional extra controls rendered in the header next to the create button. */
  toolbarActions?: React.ReactNode;
}

export interface CrudPending<V> {
  isPending: boolean;
  mutate: (variables: V) => void;
}

export interface UseCrudPageResult<T> {
  records: T[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  lookups: CrudLookups;
  filtered: T[];
  filterValues: Record<string, string>;
  setFilterValue: (key: string, value: string) => void;
  clearFilters: () => void;
  searchValue: string;
  setSearchValue: (value: string) => void;
  selected: T | null;
  setSelected: (item: T | null) => void;
  createOpen: boolean;
  openCreate: () => void;
  closeCreate: () => void;
  createForm: CrudForm;
  setCreateField: (name: string, value: any) => void;
  createError: string;
  createMutation: CrudPending<CrudForm>;
  editItem: T | null;
  editForm: CrudForm;
  setEditField: (name: string, value: any) => void;
  editError: string;
  startEdit: (item: T) => void;
  closeEdit: () => void;
  updateMutation: CrudPending<{ id: string; form: CrudForm }>;
  deleteTarget: T | null;
  startDelete: (item: T) => void;
  cancelDelete: () => void;
  deleteMutation: CrudPending<string>;
}

// ── Hook ────────────────────────────────────────────────

export function useCrudPage<T>(config: CrudPageConfig<T>): UseCrudPageResult<T> {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");
  const [selected, setSelected] = useState<T | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const initialCreate = config.initialCreate ?? {};
  const [createForm, setCreateForm] = useState<CrudForm>(initialCreate);
  const [createError, setCreateError] = useState("");
  const [editItem, setEditItem] = useState<T | null>(null);
  const [editForm, setEditForm] = useState<CrudForm>(initialCreate);
  const [editError, setEditError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  const query = useQuery<T[]>({
    queryKey: config.queryKey,
    queryFn: async () => { const d = await api.get<any>(withFullLimit(config.endpoint)); return unwrapResults<T>(d); },
    enabled: isAuthenticated,
  });
  const records = query.data;

  const lookupDefs = config.lookups ?? (config.lookup ? [config.lookup] : []);
  const lookupResults = useQueries({
    queries: lookupDefs.map((l) => ({
      queryKey: l.queryKey,
      queryFn: async () => { const d = await api.get<any>(withFullLimit(l.endpoint)); return unwrapResults<any>(d); },
      enabled: isAuthenticated,
    })),
  });

  const lookups = useMemo<CrudLookups>(() => {
    const m: CrudLookups = {};
    lookupDefs.forEach((l, i) => {
      m[l.key] = lookupResults[i]?.data ?? [];
    });
    return m;
  }, [lookupDefs, lookupResults]);

  const resolveToast = useCallback(
    (toastCfg?: CrudToast): string => {
      if (!toastCfg) return "";
      return typeof toastCfg === "string" ? toastCfg : t(toastCfg.key, toastCfg.fallback);
    },
    [t]
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: config.queryKey });
  }, [queryClient, config.queryKey]);

  const buildPayload = useCallback(
    (mode: "create" | "update", form: CrudForm): any => {
      const fn = mode === "create" ? (config.createPayload ?? config.buildPayload) : (config.updatePayload ?? config.buildPayload);
      return fn ? fn(form) : form;
    },
    [config.createPayload, config.updatePayload, config.buildPayload]
  );

  const createMutation = useMutation({
    mutationFn: (p: CrudForm) => api.post(config.endpoint, buildPayload("create", p)),
    onSuccess: () => {
      showToast("success", resolveToast(config.toasts?.create));
      setCreateOpen(false);
      setCreateForm(initialCreate);
      setCreateError("");
      invalidate();
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setCreateError(msg || config.formErrorFallback || "");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, form }: { id: string; form: CrudForm }) => api.patch(`${config.endpoint}${id}/`, buildPayload("update", form)),
    onSuccess: () => {
      showToast("success", resolveToast(config.toasts?.update));
      setEditItem(null);
      invalidate();
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setEditError(msg || config.formErrorFallback || "");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`${config.endpoint}${id}/`),
    onSuccess: () => {
      showToast("success", resolveToast(config.toasts?.delete));
      setDeleteTarget(null);
      invalidate();
    },
    onError: (err: any) => {
      showToast("error", err?.message || config.deleteErrorFallback || "");
    },
  });

  const setFilterValue = useCallback((key: string, value: string) => {
    setFilterValues((p) => ({ ...p, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilterValues({});
    setSearchValue("");
  }, []);

  const openCreate = useCallback(() => {
    setCreateOpen(true);
  }, []);

  const closeCreate = useCallback(() => {
    setCreateOpen(false);
    setCreateForm(initialCreate);
    setCreateError("");
  }, [initialCreate]);

  const startEdit = useCallback(
    (item: T) => {
      setEditItem(item);
      setEditForm(config.buildForm ? config.buildForm(item) : {});
      setEditError("");
    },
    [config.buildForm]
  );

  const closeEdit = useCallback(() => setEditItem(null), []);

  const startDelete = useCallback((item: T) => setDeleteTarget(item), []);
  const cancelDelete = useCallback(() => setDeleteTarget(null), []);

  const setCreateField = useCallback((name: string, value: any) => {
    setCreateForm((f) => ({ ...f, [name]: value }));
  }, []);

  const setEditField = useCallback((name: string, value: any) => {
    setEditForm((f) => ({ ...f, [name]: value }));
  }, []);

  const filtered = useMemo(() => {
    if (!records) return [];
    let r = records;
    for (const [k, v] of Object.entries(filterValues)) {
      if (v) r = r.filter((item) => String((item as any)[k]) === v);
    }
    if (searchValue) {
      const q = searchValue.toLowerCase();
      const fields = config.searchFields ?? [];
      r = r.filter((item) => fields.some((f) => String((item as any)[f] ?? "").toLowerCase().includes(q)));
    }
    return r;
  }, [records, filterValues, searchValue, config.searchFields]);

  return {
    records,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    lookups,
    filtered,
    filterValues,
    setFilterValue,
    clearFilters,
    searchValue,
    setSearchValue,
    selected,
    setSelected,
    createOpen,
    openCreate,
    closeCreate,
    createForm,
    setCreateField,
    createError,
    createMutation,
    editItem,
    editForm,
    setEditField,
    editError,
    startEdit,
    closeEdit,
    updateMutation,
    deleteTarget,
    startDelete,
    cancelDelete,
    deleteMutation,
  };
}
