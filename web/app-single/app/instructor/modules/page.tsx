"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

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
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedModule, setExpandedModule] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) { router.push("/login"); return; }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const session = JSON.parse(sessionStorage.getItem("maa_session") || "{}");
    fetch("/api/subjects/", { headers: { Authorization: `Bearer ${session.token}` } })
      .then(r => r.json())
      .then(d => setSubjects(d.results || []))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const fetchModules = (subjectId: string) => {
    setSelectedSubject(subjectId);
    const session = JSON.parse(sessionStorage.getItem("maa_session") || "{}");
    fetch(`/api/modules/?subject=${subjectId}`, { headers: { Authorization: `Bearer ${session.token}` } })
      .then(r => r.json())
      .then(d => setModules(d.results || []));
  };

  const toggleExpand = (id: string) => {
    setExpandedModule(expandedModule === id ? "" : id);
  };

  if (loading) {
    return <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/mast.svg" alt="MAA" width={36} height={36} className="rounded-lg" />
            <div>
              <h1 className="text-lg font-bold text-white">Module Content</h1>
              <button onClick={() => router.push("/instructor/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">
                Back to Dashboard
              </button>
            </div>
          </div>
          <a href="/admin/ground_training/" target="_blank"
            className="px-4 py-2 text-sm border border-navy-600 rounded-lg text-gray-400 hover:border-gold-500 hover:text-gold-500 transition-colors">
            Admin Panel
          </a>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Subject selector */}
        <div className="flex flex-wrap gap-2 mb-8">
          {subjects.map(s => (
            <button key={s.id} onClick={() => fetchModules(s.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedSubject === s.id
                  ? "bg-gold-500 text-navy-900"
                  : "bg-navy-800 text-gray-400 border border-navy-700 hover:border-gold-500"
              }`}>
              {s.code} ({s.module_count} modules)
            </button>
          ))}
        </div>

        {/* Modules list */}
        {selectedSubject ? (
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
                    <p className="text-sm text-gray-400 mt-1">{m.duration}h | {m.lessons.length} lessons | {m.documents.length} documents</p>
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
                      <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Lessons</h4>
                      {m.lessons.length === 0 ? (
                        <p className="text-sm text-gray-500">No lessons yet. Add them via the Admin Panel.</p>
                      ) : (
                        <div className="space-y-2">
                          {m.lessons.map(l => (
                            <div key={l.id} className="bg-navy-900 rounded-lg p-3 border border-navy-700">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-white font-medium">Lesson {l.lesson_no}: {l.title || "Untitled"}</span>
                                <span className="text-xs text-gray-500">{l.content ? `${l.content.length} chars` : "No content"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Documents */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Documents</h4>
                      {m.documents.length === 0 ? (
                        <p className="text-sm text-gray-500">No documents. Upload via the Admin Panel.</p>
                      ) : (
                        <div className="space-y-2">
                          {m.documents.map(d => (
                            <div key={d.id} className="bg-navy-900 rounded-lg p-3 border border-navy-700 flex items-center justify-between">
                              <div>
                                <span className="text-sm text-white">{d.name || "Document"}</span>
                                <span className="text-xs text-gray-500 ml-2">{d.type}</span>
                              </div>
                              {d.file_url && (
                                <a href={d.file_url} target="_blank" className="text-xs text-gold-500 hover:underline">View</a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <a href={`/admin/ground_training/module/${m.id}/change/`} target="_blank"
                        className="px-4 py-2 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded-lg text-sm hover:bg-gold-500 hover:text-navy-900 transition-colors">
                        Edit in Admin
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {modules.length === 0 && (
              <p className="text-center text-gray-500 py-12">Select a subject to view its modules.</p>
            )}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">Select a subject above to view and manage its modules.</p>
            <p className="text-gray-600 text-sm mt-2">You can add lessons, upload documents, and edit content via the Admin Panel.</p>
          </div>
        )}
      </main>
    </div>
  );
}
