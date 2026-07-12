"use client";
import { useQuery } from "@tanstack/react-query";
const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

export default function MedicalPage() {
  const { data: certs=[], isLoading } = useQuery({
    queryKey: ['medical-certs'],
    queryFn: () => fetch("/api/students/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).catch(()=>({results:[]})),
  });

  return (<div className="flex-1 min-w-0"><nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-5xl mx-auto px-6 h-16 flex items-center"><h1 className="text-lg font-bold text-white">Medical Certificates</h1></div></nav>
    <main className="px-6 py-8">{isLoading?<p className="text-gray-500">Loading...</p>:<div className="bg-navy-800 border border-navy-700 rounded-xl p-6"><p className="text-gray-400 text-sm">Medical certificate status is managed through your student profile. Contact the administration for details on your medical certificate validity and renewal.</p><p className="text-gray-500 text-xs mt-4">This page will display your medical certificate expiry date and renewal reminders when integrated with the student medical records system.</p></div>}</main></div>);
}
