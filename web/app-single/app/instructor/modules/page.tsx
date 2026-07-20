"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { ModalForm } from "@/components/modal-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";

interface Module {
  id: string;
  subject: string;
  title: string;
  duration: number;
  order: number;
  status: string;
  lessons: Lesson[];
  documents: Doc[];
}

interface Lesson {
  id: string;
  lesson_no: number;
  title: string;
  content: string;
  video_url?: string;
}

interface Doc {
  id: string;
  name: string;
  file_url: string;
  type: string;
}

interface Subject {
  id: string;
  code: string;
  title_en: string;
  module_count: number;
}

export default function ModulesPage() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedModule, setExpandedModule] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lessonFormModule, setLessonFormModule] = useState<string>("");
  const [lessonForm, setLessonForm] = useState({ lesson_no: 1, title: "", content: "", video_url: "" });
  const [savingLesson, setSavingLesson] = useState(false);

  // View lesson
  const [viewLesson, setViewLesson] = useState<Lesson | null>(null);

  // Edit lesson
  const [editLesson, setEditLesson] = useState<Lesson | null>(null);
  const [editForm, setEditForm] = useState({ lesson_no: 1, title: "", content: "", video_url: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete lesson
  const [deleteLessonId, setDeleteLessonId] = useState<string | null>(null);
  const [deletingLesson, setDeletingLesson] = useState(false);

  // Delete document
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [deletingDoc, setDeletingDoc] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.push("/login"); return; }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get<any>("/subjects/")
      .then(data => { setSubjects((data as unknown as any).results || []); setError(null); })
      .catch(err => { console.error("Failed to load subjects:", err); setError(t("instructor.failedToLoadSubjects", "Failed to load subjects. Please try again.")); })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const fetchModules = useCallback((subjectId: string) => {
    setSelectedSubject(subjectId);
    api.get<any>(`/modules/?subject=${subjectId}`)
      .then(data => { setModules((data as unknown as any).results || []); setError(null); })
      .catch(err => { console.error("Failed to load modules:", err); setError(t("instructor.failedToLoadModules", "Failed to load modules. Please try again.")); });
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedModule(expandedModule === id ? "" : id);
    setLessonFormModule("");
    setLessonForm({ lesson_no: 1, title: "", content: "", video_url: "" });
  };

  const openLessonForm = (moduleId: string, nextLessonNo: number) => {
    setLessonFormModule(moduleId);
    setLessonForm({ lesson_no: nextLessonNo, title: "", content: "", video_url: "" });
  };

  const handleCreateLesson = async (e: React.FormEvent, moduleId: string) => {
    e.preventDefault();
    setSavingLesson(true);
    try {
      await api.post("/module-lessons/", {
        module: moduleId,
        lesson_no: lessonForm.lesson_no,
        title: lessonForm.title,
        content: lessonForm.content,
        video_url: lessonForm.video_url || undefined,
      });
      setLessonFormModule("");
      setLessonForm({ lesson_no: 1, title: "", content: "", video_url: "" });
      if (selectedSubject) fetchModules(selectedSubject);
    } catch (err: any) {
      console.error("Failed to create lesson:", err);
      setError(err.message || "Failed to create lesson.");
    } finally {
      setSavingLesson(false);
    }
  };

  const startEdit = (l: Lesson) => {
    setEditLesson(l);
    setEditForm({ lesson_no: l.lesson_no, title: l.title || "", content: l.content || "", video_url: l.video_url || "" });
  };

  const handleEditLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLesson) return;
    setSavingEdit(true);
    try {
      await api.patch(`/module-lessons/${editLesson.id}/`, {
        lesson_no: editForm.lesson_no,
        title: editForm.title,
        content: editForm.content,
        video_url: editForm.video_url || undefined,
      });
      setEditLesson(null);
      if (selectedSubject) fetchModules(selectedSubject);
    } catch (err: any) {
      console.error("Failed to update lesson:", err);
      setError(err.message || "Failed to update lesson.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteLesson = async () => {
    if (!deleteLessonId) return;
    setDeletingLesson(true);
    try {
      await api.delete(`/module-lessons/${deleteLessonId}/`);
      showToast("success", t("instructor.lessonDeleted", "Lesson deleted successfully"));
      setDeleteLessonId(null);
      if (selectedSubject) fetchModules(selectedSubject);
    } catch (err: any) {
      console.error("Failed to delete lesson:", err);
      showToast("error", err.message || t("instructor.lessonDeleteFailed", "Failed to delete lesson"));
    } finally {
      setDeletingLesson(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!deleteDocId) return;
    setDeletingDoc(true);
    try {
      await api.delete(`/module-documents/${deleteDocId}/`);
      showToast("success", t("instructor.documentDeleted", "Document deleted successfully"));
      setDeleteDocId(null);
      if (selectedSubject) fetchModules(selectedSubject);
    } catch (err: any) {
      console.error("Failed to delete document:", err);
      showToast("error", err.message || t("instructor.documentDeleteFailed", "Failed to delete document"));
    } finally {
      setDeletingDoc(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 p-8">
        <LoadingSkeleton type="card" rows={6} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">{t("instructor.moduleContent", "Module Content")}</h1>
              <button onClick={() => router.push("/instructor/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">
                {t("instructor.backToDashboard", "Back to Dashboard")}
              </button>
            </div>
          </div>
          <span className="px-4 py-2 text-sm border border-navy-600 rounded-lg text-gray-400">
            {t("instructor.myModules", "My Modules")}
          </span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} />}

        {subjects.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-8">
            {subjects.map(s => (
              <button key={s.id} onClick={() => fetchModules(s.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedSubject === s.id
                    ? "bg-gold-500 text-navy-900"
                    : "bg-navy-800 text-gray-400 border border-navy-700 hover:border-gold-500"
                }`}>
                {s.code} ({s.module_count} {t("instructor.modules", "modules")})
              </button>
            ))}
          </div>
        ) : (
          !loading && <EmptyState message={t("instructor.noSubjects", "No subjects available.")} />
        )}

        {selectedSubject ? (
          modules.length === 0 ? (
            <EmptyState message={t("instructor.selectSubject", "Select a subject to view its modules.")} />
          ) : (
            <div className="space-y-4">
              {modules.map(m => (
                <div key={m.id} className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
                  <button onClick={() => toggleExpand(m.id)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-navy-700/50 transition-colors">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono">
                          M{m.order}
                        </span>
                        <h3 className="text-white font-semibold">{m.title}</h3>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{m.duration}h | {m.lessons.length} {t("instructor.lessons", "lessons")} | {m.documents.length} {t("instructor.documents", "documents")}</p>
                    </div>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedModule === m.id ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedModule === m.id && (
                    <div className="border-t border-navy-700 p-5 space-y-4">
                      {/* Lessons */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{t("instructor.lessons", "Lessons")}</h4>
                          <button onClick={() => openLessonForm(m.id, Math.max(...m.lessons.map(l => l.lesson_no), 0) + 1)}
                            className="px-3 py-1 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded text-xs transition-colors">
                            + {t("instructor.addLesson", "Add Lesson")}
                          </button>
                        </div>
                        {m.lessons.length === 0 && lessonFormModule !== m.id ? (
                          <p className="text-sm text-gray-500">{t("instructor.noLessons", "No lessons yet. Click \"Add Lesson\" to create one.")}</p>
                        ) : (
                          <div className="space-y-2">
                            {m.lessons.map(l => (
                              <div key={l.id} className="bg-navy-900 rounded-lg p-3 border border-navy-700">
                                {/* Edit mode */}
                                {editLesson?.id === l.id ? (
                                  <form onSubmit={handleEditLesson} className="space-y-3">
                                    <h5 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">{t("instructor.editLesson", "Edit Lesson")} {l.lesson_no}</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">{t("instructor.lessonNumber", "Lesson #")}</label>
                                        <input type="number" min="1" value={editForm.lesson_no}
                                          onChange={e => setEditForm({ ...editForm, lesson_no: parseInt(e.target.value) || 1 })}
                                          className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm" />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">{t("instructor.title", "Title")}</label>
                                        <input type="text" value={editForm.title}
                                          onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                          className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm" />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">{t("instructor.content", "Content")}</label>
                                      <textarea rows={4} value={editForm.content}
                                        onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                                        className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm resize-y" />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">{t("instructor.videoUrl", "Video URL")}</label>
                                      <input type="url" value={editForm.video_url}
                                        onChange={e => setEditForm({ ...editForm, video_url: e.target.value })}
                                        className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm" />
                                    </div>
                                    <div className="flex gap-2">
                                      <button type="submit" disabled={savingEdit}
                                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50">
                                        {savingEdit ? t("instructor.saving", "Saving...") : t("instructor.saveChanges", "Save Changes")}
                                      </button>
                                      <button type="button" onClick={() => setEditLesson(null)}
                                        className="px-4 py-2 bg-navy-800 border border-navy-600 text-gray-400 rounded-lg text-sm hover:text-white transition-colors">
                                        {t("instructor.cancel", "Cancel")}
                                      </button>
                                    </div>
                                  </form>
                                ) : (
                                  <>
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1 min-w-0">
                                        <span className="text-sm text-white font-medium">{t("instructor.lessonLabel", "Lesson")} {l.lesson_no}: {l.title || t("instructor.untitled", "Untitled")}</span>
                                        <span className="text-xs text-gray-500 ml-2">{l.content ? `${l.content.length} ${t("instructor.chars", "chars")}` : t("instructor.noContent", "No content")}</span>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0 ml-2">
                                        <button onClick={() => setViewLesson(l)}
                                          className="px-2 py-1 text-xs text-gray-400 border border-navy-600 rounded hover:text-white hover:border-gray-500 transition-colors">
                                          {t("instructor.view", "View")}
                                        </button>
                                        <button onClick={() => startEdit(l)}
                                          className="px-2 py-1 text-xs text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/10 transition-colors">
                                          {t("instructor.edit", "Edit")}
                                        </button>
                                        <button onClick={() => setDeleteLessonId(l.id)}
                                          className="px-2 py-1 text-xs text-red-400 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors">
                                          {t("instructor.delete", "Del")}
                                        </button>
                                      </div>
                                    </div>
                                    {l.content && (
                                      <p className="text-xs text-gray-400 mt-2 line-clamp-2">{l.content}</p>
                                    )}
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Inline lesson creation form */}
                        {lessonFormModule === m.id && (
                          <form onSubmit={(e) => handleCreateLesson(e, m.id)}
                            className="mt-3 bg-navy-900 rounded-lg p-4 border border-gold-500/30 space-y-3">
                            <h5 className="text-xs font-semibold text-gold-500 uppercase tracking-wider">{t("instructor.newLesson", "New Lesson")}</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">{t("instructor.lessonNumber", "Lesson #")}</label>
                                <input type="number" min="1" value={lessonForm.lesson_no}
                                  onChange={e => setLessonForm({ ...lessonForm, lesson_no: parseInt(e.target.value) || 1 })}
                                  className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm" />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">{t("instructor.title", "Title")}</label>
                                <input type="text" value={lessonForm.title}
                                  onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })}
                                  placeholder={t("instructor.lessonTitlePlaceholder", "e.g. ICAO Annex 2")}
                                  className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm" />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">{t("instructor.content", "Content")}</label>
                              <textarea rows={4} value={lessonForm.content}
                                onChange={e => setLessonForm({ ...lessonForm, content: e.target.value })}
                                placeholder={t("instructor.contentPlaceholder", "Lesson content, notes, key points...")}
                                className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm resize-y" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">{t("instructor.videoUrl", "Video URL")}</label>
                              <input type="url" value={lessonForm.video_url}
                                onChange={e => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                                placeholder={t("instructor.videoUrlPlaceholder", "https://www.youtube.com/watch?v=...")}
                                className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm" />
                            </div>
                            <div className="flex gap-2">
                              <button type="submit" disabled={savingLesson}
                                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm transition-colors disabled:opacity-50">
                                {savingLesson ? t("instructor.saving", "Saving...") : t("instructor.createLesson", "Create Lesson")}
                              </button>
                              <button type="button" onClick={() => { setLessonFormModule(""); }}
                                className="px-4 py-2 bg-navy-800 border border-navy-600 text-gray-400 rounded-lg text-sm hover:text-white transition-colors">
                                {t("instructor.cancel", "Cancel")}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>

                      {/* Documents */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">{t("instructor.documents", "Documents")}</h4>
                        {m.documents.length === 0 ? (
                          <p className="text-sm text-gray-500">{t("instructor.noDocuments", "No documents yet. Use the upload form below.")}</p>
                        ) : (
                          <div className="space-y-2">
                            {m.documents.map(d => (
                              <div key={d.id} className="bg-navy-900 rounded-lg p-3 border border-navy-700 flex items-center justify-between">
                                <div>
                                  <span className="text-sm text-white">{d.name || t("instructor.document", "Document")}</span>
                                  <span className="text-xs text-gray-500 ml-2">{d.type}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {d.file_url && (
                                    <a href={d.file_url} target="_blank" className="text-xs text-gold-500 hover:underline">{t("instructor.view", "View")}</a>
                                  )}
                                  <button onClick={() => setDeleteDocId(d.id)}
                                    className="px-2 py-1 text-xs text-red-400 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors">
                                    {t("instructor.delete", "Del")}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Upload form */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">{t("instructor.uploadDocument", "Upload Document")}</h4>
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          const formEl = e.target as HTMLFormElement;
                          const fileInput = formEl.querySelector('input[type="file"]') as HTMLInputElement;
                          const nameInput = formEl.querySelector('input[name="doc_name"]') as HTMLInputElement;
                          const file = fileInput?.files?.[0];
                          if (!file) return;
                          const fd = new FormData();
                          fd.append('file', file);
                          fd.append('name', nameInput?.value || file.name);
                          fd.append('type', file.type.split('/')[1] || 'pdf');
                          await fetch(`/api/modules/${m.id}/upload_document/`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${api.getAccessToken()}` },
                            body: fd,
                          });
                          fetchModules(selectedSubject);
                          formEl.reset();
                        }}
                          className="flex flex-col sm:flex-row gap-3 items-end bg-navy-900 rounded-lg p-4 border border-navy-700">
                          <div className="flex-1 w-full">
                            <label className="block text-xs text-gray-500 mb-1">{t("instructor.documentName", "Document Name")}</label>
                            <input name="doc_name" className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm" placeholder={t("instructor.uploadPlaceholder", "e.g. Week 1 Slides")} />
                          </div>
                          <div className="flex-1 w-full">
                            <label className="block text-xs text-gray-500 mb-1">{t("instructor.file", "File")}</label>
                            <input type="file" className="w-full text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gold-500 file:text-navy-900 hover:file:bg-gold-600" />
                          </div>
                          <button type="submit" className="px-5 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm transition-colors whitespace-nowrap">
                            {t("instructor.upload", "Upload")}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          !loading && (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">{t("instructor.selectSubjectManage", "Select a subject above to view and manage its modules.")}</p>
              <p className="text-gray-600 text-sm mt-2">{t("instructor.selectSubjectDescription", "Select a subject to view modules, add lessons, and upload documents.")}</p>
            </div>
          )
        )}
      </main>

      {/* View Lesson Modal */}
      <ModalForm
        open={!!viewLesson}
        onClose={() => setViewLesson(null)}
        title={viewLesson ? `${t('instructor.lessonLabel', 'Lesson')} ${viewLesson.lesson_no}: ${viewLesson.title || t('instructor.untitled', 'Untitled')}` : ''}
      >
        {viewLesson && (
          <div className="space-y-4">
            {viewLesson.video_url && (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
                <iframe
                  src={viewLesson.video_url.includes('youtube.com') || viewLesson.video_url.includes('youtu.be')
                    ? `https://www.youtube.com/embed/${(viewLesson.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/) || [])[1] || ''}`
                    : viewLesson.video_url}
                  title="Lesson video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            )}
            <div className="bg-navy-900 border border-navy-700 rounded-lg p-4 max-h-96 overflow-y-auto">
              {viewLesson.content ? (
                <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{viewLesson.content}</p>
              ) : (
                <p className="text-sm text-gray-500">{t('instructor.noContent', 'No content')}</p>
              )}
            </div>
          </div>
        )}
      </ModalForm>

      {/* Delete Lesson Confirm */}
      <ConfirmDialog
        open={!!deleteLessonId}
        onClose={() => setDeleteLessonId(null)}
        onConfirm={handleDeleteLesson}
        title={t('instructor.deleteLesson', 'Delete Lesson')}
        message={t('instructor.deleteLessonConfirm', 'Are you sure you want to delete this lesson? This action cannot be undone.')}
        confirmLabel={t('instructor.delete', 'Delete')}
        destructive
        loading={deletingLesson}
      />

      {/* Delete Document Confirm */}
      <ConfirmDialog
        open={!!deleteDocId}
        onClose={() => setDeleteDocId(null)}
        onConfirm={handleDeleteDocument}
        title={t('instructor.deleteDocument', 'Delete Document')}
        message={t('instructor.deleteDocumentConfirm', 'Are you sure you want to delete this document?')}
        confirmLabel={t('instructor.delete', 'Delete')}
        destructive
        loading={deletingDoc}
      />
    </div>
  );
}
