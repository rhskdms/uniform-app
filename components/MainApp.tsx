"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabaseClient";

type Submission = {
  id: string;
  studentName: string;
  number: string;
  date: string;
  photoUrl?: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  approvedAt?: string;
};

const ADMIN_PASSWORD = "98765";
const DAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];

function getDayOfWeek(year: number, month: number, day: number) {
  return DAYS_KO[new Date(year, month - 1, day).getDay()];
}
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

const TODAY = new Date();
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

function getMonthFromDateString(dateStr: string) {
  const match = dateStr.match(/^\d{4}-(\d{2})-\d{2}/);
  return match ? parseInt(match[1], 10) : null;
}

function getUniformCounts(submissions: Submission[], month: number) {
  const map: Record<string, { studentName: string; number: string; count: number }> = {};
  for (const s of submissions) {
    if (s.status === "approved" && getMonthFromDateString(s.date) === month) {
      const key = `${s.studentName}-${s.number}`;
      if (!map[key]) map[key] = { studentName: s.studentName, number: s.number, count: 0 };
      map[key].count++;
    }
  }
  return Object.values(map).sort((a, b) => b.count - a.count);
}

function nowString() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")} ${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`;
}

// Supabase 행(row) <-> 우리 코드 타입 변환
function rowToSubmission(row: any): Submission {
  return {
    id: row.id,
    studentName: row.student_name,
    number: row.number,
    date: row.date,
    photoUrl: row.photo_url ?? undefined,
    submittedAt: row.submitted_at,
    status: row.status,
    approvedAt: row.approved_at ?? undefined,
  };
}

// ——— Student View ———
function StudentView({ onSubmit }: { onSubmit: (s: Omit<Submission, "id" | "status">) => void }) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [month, setMonth] = useState(String(TODAY.getMonth() + 1));
  const [day, setDay] = useState(String(TODAY.getDate()));
  const [preview, setPreview] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentYear = TODAY.getFullYear();
  const maxDay = getDaysInMonth(currentYear, Number(month));
  const safeDay = Math.min(Number(day), maxDay);
  const dayOfWeek = getDayOfWeek(currentYear, Number(month), safeDay);
  const dateString = `${currentYear}-${String(month).padStart(2,"0")}-${String(safeDay).padStart(2,"0")} (${dayOfWeek})`;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !number) return;
    setSubmitting(true);
    await onSubmit({ studentName: name, number, date: dateString, photoUrl: preview ?? undefined, submittedAt: nowString() });
    setSubmitting(false);
    setSubmitted(true);
  }

  function reset() {
    setSubmitted(false); setName(""); setNumber(""); setPreview(null);
    setMonth(String(TODAY.getMonth()+1)); setDay(String(TODAY.getDate()));
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20 px-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>제출 완료!</p>
          <p className="text-gray-700 mt-1 text-sm">관리자 승인 후 교복 착용 횟수에 반영됩니다.</p>
        </div>
        <button onClick={reset} className="px-5 py-2.5 bg-[#1a56db] text-white rounded-xl text-sm font-medium hover:bg-[#1343b0] active:bg-[#1343b0] transition-colors">
          다시 제출하기
        </button>
      </div>
    );
  }

  const selectCls = "border border-[#dde1e9] rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a56db]/30 focus:border-[#1a56db] transition bg-white w-full appearance-none text-gray-900";

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto py-8 px-5 flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>교복 착용 인증</h2>
        <p className="text-sm text-gray-700 mt-1">정보를 입력하고 제출하세요. 관리자 확인 후 승인됩니다.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">이름</label>
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="홍길동" required
          className="border border-[#dde1e9] rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a56db]/30 focus:border-[#1a56db] transition bg-white text-gray-900"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">번호</label>
        <div className="relative">
          <select value={number} onChange={(e) => setNumber(e.target.value)} required className={selectCls}>
            <option value="">선택하세요</option>
            {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={String(n)}>{n}번</option>
            ))}
          </select>
          <ChevronDown />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          날짜 <span className="text-[#1a56db] font-bold ml-1">{dayOfWeek}요일</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <select value={month} onChange={(e) => setMonth(e.target.value)} className={selectCls}>
              {MONTH_OPTIONS.map((m) => <option key={m} value={String(m)}>{m}월</option>)}
            </select>
            <ChevronDown />
          </div>
          <div className="relative">
            <select value={String(safeDay)} onChange={(e) => setDay(e.target.value)} className={selectCls}>
              {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                <option key={d} value={String(d)}>{d}일</option>
              ))}
            </select>
            <ChevronDown />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">교복 착용 사진</label>
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-[#dde1e9] rounded-2xl overflow-hidden cursor-pointer hover:border-[#1a56db] active:border-[#1a56db] transition-colors bg-white"
        >
          {preview ? (
            <img src={preview} alt="미리보기" className="w-full h-56 object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center h-44 gap-2 text-gray-500 select-none">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-sm font-medium">탭하여 사진 찍기</span>
              <span className="text-xs">카메라</span>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
        {preview && (
          <button type="button" onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
            className="text-xs text-gray-600 underline self-start">사진 다시 선택</button>
        )}
      </div>

      <button
        type="submit"
        disabled={!name || !number || submitting}
        className="w-full py-3.5 bg-[#1a56db] text-white rounded-xl font-semibold text-base hover:bg-[#1343b0] active:bg-[#1343b0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-1"
        style={{ fontFamily: "DM Sans, sans-serif" }}
      >
        {submitting ? "제출 중..." : "제출하기"}
      </button>
    </form>
  );
}

function ChevronDown() {
  return (
    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function AdminGate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) { onUnlock(); }
    else { setError(true); setPw(""); }
  }

  return (
    <div className="flex items-center justify-center h-full px-5">
      <form onSubmit={handleSubmit} className="bg-white border border-[#dde1e9] rounded-2xl p-8 w-full max-w-xs shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-[#1a56db] rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-base" style={{ fontFamily: "DM Sans, sans-serif" }}>관리자 로그인</p>
            <p className="text-xs text-gray-600">비밀번호를 입력하세요</p>
          </div>
        </div>
        <input
          type="password" value={pw}
          onChange={(e) => { setPw(e.target.value); setError(false); }}
          placeholder="비밀번호" autoFocus
          className={`border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 transition bg-white text-gray-900 ${
            error ? "border-red-400 focus:ring-red-200 focus:border-red-400" : "border-[#dde1e9] focus:ring-[#1a56db]/30 focus:border-[#1a56db]"
          }`}
        />
        {error && <p className="text-xs text-red-600 -mt-2">비밀번호가 올바르지 않습니다.</p>}
        <button type="submit" className="w-full py-3 bg-[#1a56db] text-white rounded-xl font-semibold text-sm hover:bg-[#1343b0] active:bg-[#1343b0] transition-colors" style={{ fontFamily: "DM Sans, sans-serif" }}>
          확인
        </button>
      </form>
    </div>
  );
}

function AdminView({ submissions, onApprove, onReject }: {
  submissions: Submission[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [tab, setTab] = useState<"pending" | "history" | "stats">("pending");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [statsMonth, setStatsMonth] = useState(String(TODAY.getMonth() + 1));

  const pending = submissions.filter((s) => s.status === "pending");
  const approved = submissions.filter((s) => s.status === "approved");
  const counts = getUniformCounts(submissions, Number(statsMonth));

  const tabBtn = (key: typeof tab, label: string, count: number | null) => (
    <button
      key={key} onClick={() => setTab(key)}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        tab === key ? "border-[#1a56db] text-[#1a56db]" : "border-transparent text-gray-600 hover:text-gray-800"
      }`}
    >
      {label}
      {count !== null && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${tab === key ? "bg-[#1a56db]/10 text-[#1a56db]" : "bg-gray-100 text-gray-600"}`}>{count}</span>
      )}
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex bg-white border-b border-[#dde1e9] shrink-0">
        {tabBtn("pending", "승인 대기", pending.length)}
        {tabBtn("history", "승인 내역", approved.length)}
        {tabBtn("stats", "착용 현황", null)}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {tab === "pending" && (
          <>
            <p className="text-sm font-semibold text-gray-900 mb-3">승인 대기 {pending.length}건</p>
            {pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <svg className="w-10 h-10 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm">대기 중인 제출이 없습니다</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {pending.map((s) => (
                  <div key={s.id} className="bg-white rounded-2xl border border-[#dde1e9] overflow-hidden">
                    {s.photoUrl && (
                      <img src={s.photoUrl} alt={s.studentName} className="w-full h-52 object-cover cursor-pointer bg-gray-100" onClick={() => setLightbox(s.photoUrl!)} />
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>{s.studentName}</p>
                          <p className="text-sm text-gray-700">{s.number}번 · {s.date}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{s.submittedAt} 제출</p>
                        </div>
                        <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-1 rounded-full shrink-0">대기중</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => onApprove(s.id)} className="flex-1 py-2.5 bg-[#1a56db] text-white rounded-xl text-sm font-semibold hover:bg-[#1343b0] active:bg-[#1343b0] transition-colors">승인</button>
                        <button onClick={() => onReject(s.id)} className="flex-1 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 active:bg-red-50 transition-colors">거절</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "history" && (
          <>
            <p className="text-sm font-semibold text-gray-900 mb-3">승인 내역 {approved.length}건</p>
            <div className="flex flex-col gap-2">
              {approved.map((s) => (
                <div key={s.id} className="bg-white rounded-2xl border border-[#dde1e9] p-4 flex items-center gap-3">
                  {s.photoUrl ? (
                    <img src={s.photoUrl} alt={s.studentName} className="w-12 h-12 rounded-xl object-cover bg-gray-100 shrink-0 cursor-pointer" onClick={() => setLightbox(s.photoUrl!)} />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gray-100 shrink-0 flex items-center justify-center text-gray-400">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{s.studentName} <span className="font-normal text-gray-700">{s.number}번</span></p>
                    <p className="text-xs text-gray-700">{s.date}</p>
                    <p className="text-xs text-gray-600">승인 {s.approvedAt}</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 font-semibold px-2 py-1 rounded-full shrink-0">승인</span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "stats" && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900">착용 현황</p>
              <div className="relative">
                <select value={statsMonth} onChange={(e) => setStatsMonth(e.target.value)} className="border border-[#dde1e9] rounded-lg pl-3 pr-8 py-1.5 text-sm font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a56db]/30 appearance-none">
                  {MONTH_OPTIONS.map((m) => <option key={m} value={String(m)}>{m}월</option>)}
                </select>
                <ChevronDown />
              </div>
            </div>
            {counts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <p className="text-sm">{statsMonth}월에 승인된 착용 기록이 없습니다</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {counts.map((r, i) => (
                  <div key={`${r.studentName}-${r.number}`} className="bg-white rounded-2xl border border-[#dde1e9] p-4 flex items-center gap-4">
                    <span className="text-xs text-gray-500 font-mono w-5 text-center shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{r.studentName} <span className="font-normal text-gray-700">{r.number}번</span></p>
                      <div className="mt-1.5 h-1.5 rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-[#1a56db] transition-all" style={{ width: `${(r.count / (counts[0]?.count || 1)) * 100}%` }} />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-0.5 shrink-0">
                      <span className="font-bold text-[#1a56db] text-lg" style={{ fontFamily: "DM Sans, sans-serif" }}>{r.count}</span>
                      <span className="text-xs text-gray-600">회</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="사진" className="max-w-full max-h-full rounded-2xl object-contain" />
        </div>
      )}
    </div>
  );
}

// ——— Root App ———
export default function App() {
  const [view, setView] = useState<"student" | "admin">("student");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // 앱 시작 시 Supabase에서 데이터 불러오기
  useEffect(() => {
    async function loadData() {
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (!error && data) {
        setSubmissions(data.map(rowToSubmission));
      }
      setLoading(false);
    }
    loadData();
  }, []);

  async function handleSubmit(data: Omit<Submission, "id" | "status">) {
    const { data: inserted, error } = await supabase
      .from("submissions")
      .insert({
        student_name: data.studentName,
        number: data.number,
        date: data.date,
        photo_url: data.photoUrl ?? null,
        submitted_at: data.submittedAt,
        status: "pending",
      })
      .select()
      .single();

    if (!error && inserted) {
      setSubmissions((prev) => [rowToSubmission(inserted), ...prev]);
    }
  }

  async function handleApprove(id: string) {
    const approvedAt = nowString();
    const { error } = await supabase
      .from("submissions")
      .update({ status: "approved", approved_at: approvedAt })
      .eq("id", id);
    if (!error) {
      setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, status: "approved", approvedAt } : s));
    }
  }

  async function handleReject(id: string) {
    const { error } = await supabase
      .from("submissions")
      .update({ status: "rejected" })
      .eq("id", id);
    if (!error) {
      setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, status: "rejected" } : s));
    }
  }

  function handleAdminTab() {
    setView("admin");
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#f5f6f8]">
        <p className="text-gray-500 text-sm">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#f5f6f8]">
      <header className="bg-white border-b border-[#dde1e9] px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#1a56db] rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-sm" style={{ fontFamily: "DM Sans, sans-serif" }}>교복 착용 인증</span>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button onClick={() => setView("student")} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "student" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}>
            학생
          </button>
          <button onClick={handleAdminTab} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "admin" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}>
            {!adminUnlocked && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            )}
            관리자
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        {view === "student" ? (
          <StudentView onSubmit={handleSubmit} />
        ) : adminUnlocked ? (
          <AdminView submissions={submissions} onApprove={handleApprove} onReject={handleReject} />
        ) : (
          <AdminGate onUnlock={() => setAdminUnlocked(true)} />
        )}
      </div>
    </div>
  );
}