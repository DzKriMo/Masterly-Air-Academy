"use client";

import { useMemo } from "react";
import { useTranslation } from "@/lib/use-translation";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import {
  useCrudPage,
  CrudPageConfig,
  CrudField,
  CrudForm,
  CrudLookups,
  CrudOption,
  CrudOptions,
  CrudActions,
} from "@/lib/use-crud-page";

export type { CrudPageConfig, CrudField, CrudActions } from "@/lib/use-crud-page";

function resolveOptions(options: CrudOptions | undefined, lookups: CrudLookups): CrudOption[] {
  if (!options) return [];
  return typeof options === "function" ? options(lookups) : options;
}

const INPUT_BASE =
  "w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none";

function FormField({
  field,
  value,
  onChange,
  lookups,
}: {
  field: CrudField;
  value: any;
  onChange: (value: any) => void;
  lookups: CrudLookups;
}) {
  const label = (
    <label className="block text-sm text-gray-400 mb-1">
      {field.label}
      {field.required && <span className="text-red-400"> *</span>}
    </label>
  );

  switch (field.type) {
    case "select": {
      const options = resolveOptions(field.options, lookups);
      return (
        <div>
          {label}
          <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={INPUT_BASE}>
            {field.placeholder ? <option value="">{field.placeholder}</option> : null}
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );
    }
    case "textarea":
      return (
        <div>
          {label}
          <textarea
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            rows={field.rows ?? 2}
            className={`${INPUT_BASE} resize-none`}
          />
        </div>
      );
    case "checkbox":
      return (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded bg-navy-900 border-navy-700 text-gold-500 focus:ring-gold-500/30"
          />
          <span className="text-sm text-gray-300">{field.label}</span>
        </label>
      );
    case "datetime":
      return (
        <div>
          {label}
          <input type="datetime-local" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={INPUT_BASE} />
        </div>
      );
    case "date":
      return (
        <div>
          {label}
          <input type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={INPUT_BASE} />
        </div>
      );
    case "time":
      return (
        <div>
          {label}
          <input type="time" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={INPUT_BASE} />
        </div>
      );
    default:
      return (
        <div>
          {label}
          <input
            type="text"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={`${INPUT_BASE}${field.mono ? " font-mono" : ""}`}
            placeholder={field.placeholder}
          />
        </div>
      );
  }
}

function FormFields({
  fields,
  values,
  onChange,
  lookups,
}: {
  fields: CrudField[];
  values: CrudForm;
  onChange: (name: string, value: any) => void;
  lookups: CrudLookups;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {fields.map((field) => (
        <div key={field.name} className={field.span === "half" ? "" : "col-span-2"}>
          <FormField field={field} value={values[field.name]} onChange={(v) => onChange(field.name, v)} lookups={lookups} />
        </div>
      ))}
    </div>
  );
}

function canSubmit(fields: CrudField[], form: CrudForm): boolean {
  return fields
    .filter((f) => f.requiredForSubmit ?? f.required)
    .every((f) => String(form[f.name] ?? "").trim() !== "");
}

export function HubCrud<T extends { id: string }>(config: CrudPageConfig<T>) {
  const crud = useCrudPage<T>(config);
  const { t } = useTranslation();

  const allowCreate = config.allowCreate !== false;
  const allowEdit = config.allowEdit !== false;
  const allowDelete = config.allowDelete !== false;
  const showDetailModal = config.showDetailModal !== false;
  const showFilterBar = config.showFilterBar !== false;

  const createFields = useMemo<CrudField[]>(
    () => (typeof config.fields === "function" ? config.fields("create") : config.fields ?? []),
    [config.fields]
  );
  const editFields = useMemo<CrudField[]>(
    () => (typeof config.fields === "function" ? config.fields("edit") : config.fields ?? []),
    [config.fields]
  );

  const renderActions =
    config.renderActions ??
    ((_item: T, actions: CrudActions) => (
      <>
        <button onClick={actions.onEdit} className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded">
          {t("common.edit")}
        </button>
        <button onClick={actions.onDelete} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded">
          {t("common.delete")}
        </button>
      </>
    ));

  const columns: Column<T>[] =
    allowEdit || allowDelete
      ? [
          ...config.columns,
          {
            key: "actions",
            header: "",
            render: (item: T) => (
              <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                {renderActions(item, {
                  onEdit: () => crud.startEdit(item),
                  onDelete: () => crud.startDelete(item),
                  t,
                })}
              </div>
            ),
          },
        ]
      : config.columns;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white">{config.titleFallback}</h2>
          {crud.records && (
            <p className="text-xs text-gray-500 mt-0.5">
              {crud.filtered.length} / {crud.records.length} shown
            </p>
          )}
        </div>
        {allowCreate && (
          <button
            onClick={crud.openCreate}
            className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400"
          >
            {config.createLabel ?? "+ New"}
          </button>
        )}
      </div>

      {crud.error && (
        <ErrorCard message={crud.error?.message || config.errorFallback || "Failed to load"} onRetry={crud.refetch} />
      )}

      {showFilterBar && (
        <FilterBar
          filters={(config.filterFields ?? []).map((f) => ({
            key: f.key,
            label: f.label,
            options: resolveOptions(f.options, crud.lookups),
          }))}
          values={crud.filterValues}
          onChange={crud.setFilterValue}
          onClear={crud.clearFilters}
          searchValue={crud.searchValue}
          onSearchChange={crud.setSearchValue}
          searchPlaceholder={config.searchPlaceholder}
        />
      )}

      {crud.isLoading ? (
        <LoadingSkeleton type="table" rows={8} />
      ) : crud.filtered.length === 0 ? (
        <EmptyState
          title={(crud.records?.length ?? 0) === 0 ? config.emptyTitle : "No matches"}
          message={(crud.records?.length ?? 0) === 0 ? config.emptyMessage : "No matches."}
          action={
            (crud.records?.length ?? 0) === 0 && config.emptyActionLabel
              ? { label: config.emptyActionLabel, onClick: crud.openCreate }
              : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={crud.filtered}
          keyField="id"
          pageSize={config.pageSize ?? 15}
          onRowClick={showDetailModal ? (item) => crud.setSelected(item) : undefined}
        />
      )}

      {showDetailModal && crud.selected && config.detailFields && (
        <ModalForm
          open={!!crud.selected}
          onClose={() => crud.setSelected(null)}
          title={config.detailTitle ?? "Details"}
          footer={
            <button
              onClick={() => crud.setSelected(null)}
              className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white"
            >
              {t("common.close")}
            </button>
          }
        >
          <div className="space-y-4">
            {config.detailFields(crud.selected).map((f) => (
              <div key={f.label}>
                <p className="text-xs text-gray-500 mb-0.5">{f.label}</p>
                <p className="text-sm text-white">{f.value}</p>
              </div>
            ))}
            {config.detailExtra && config.detailExtra(crud.selected)}
          </div>
        </ModalForm>
      )}

      {allowCreate && (
        <ModalForm
          open={crud.createOpen}
          onClose={crud.closeCreate}
          title={config.createTitle ?? "New"}
          footer={
            <>
              <button
                onClick={crud.closeCreate}
                disabled={crud.createMutation.isPending}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => crud.createMutation.mutate(crud.createForm)}
                disabled={crud.createMutation.isPending || !canSubmit(createFields, crud.createForm)}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
              >
                {crud.createMutation.isPending ? "Creating..." : "Create"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {crud.createError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                {crud.createError}
              </div>
            )}
            <FormFields fields={createFields} values={crud.createForm} onChange={crud.setCreateField} lookups={crud.lookups} />
          </div>
        </ModalForm>
      )}

      {allowEdit && crud.editItem && (
        <ModalForm
          open={!!crud.editItem}
          onClose={crud.closeEdit}
          title={config.editTitle ?? "Edit"}
          footer={
            <>
              <button
                onClick={crud.closeEdit}
                disabled={crud.updateMutation.isPending}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => {
                  if (crud.editItem) crud.updateMutation.mutate({ id: crud.editItem.id, form: crud.editForm });
                }}
                disabled={crud.updateMutation.isPending || !canSubmit(editFields, crud.editForm)}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
              >
                {crud.updateMutation.isPending ? "Saving..." : "Save"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {crud.editError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{crud.editError}</div>
            )}
            <FormFields fields={editFields} values={crud.editForm} onChange={crud.setEditField} lookups={crud.lookups} />
          </div>
        </ModalForm>
      )}

      {allowDelete && crud.deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={crud.cancelDelete}
        >
          <div
            className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">{config.deleteTitle ?? "Delete"}</h3>
            <p className="text-sm text-gray-400">{config.deleteMessage ?? "Delete this item?"}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={crud.cancelDelete}
                disabled={crud.deleteMutation.isPending}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => crud.deleteMutation.mutate(crud.deleteTarget!.id)}
                disabled={crud.deleteMutation.isPending}
                className="px-4 py-2 text-sm bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 disabled:opacity-50"
              >
                {crud.deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
