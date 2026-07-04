"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Brain, Cpu, CheckCircle2, XCircle, RefreshCw,
  Save, AlertCircle, Zap, Settings, Info
} from "lucide-react";

const PRESET_MODELS = [
  { value: "phi3",      label: "Phi-3 Mini (recommended, fast)" },
  { value: "phi3:medium", label: "Phi-3 Medium (better quality)" },
  { value: "llama3.2", label: "Llama 3.2 3B" },
  { value: "llama3",   label: "Llama 3 8B" },
  { value: "mistral",  label: "Mistral 7B" },
  { value: "gemma2",   label: "Gemma 2 2B" },
  { value: "deepseek-r1:7b", label: "DeepSeek-R1 7B" },
];

export default function AISettingsPage() {
  const { user, token, API_BASE } = useAuth();
  const router = useRouter();

  const [settings, setSettings]   = useState({
    model: "phi3", endpoint: "http://localhost:11434",
    timeout: 60000, enabled: true,
    temperature: 0.1, top_p: 0.9, top_k: 20,
    repeat_penalty: 1.1, num_predict: 1024
  });
  const [health,   setHealth]     = useState(null);
  const [loading,  setLoading]    = useState(true);
  const [saving,   setSaving]     = useState(false);
  const [testing,  setTesting]    = useState(false);
  const [error,    setError]      = useState("");
  const [saved,    setSaved]      = useState(false);
  const [testMsg,  setTestMsg]    = useState(null);

  const getHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    ...(token && !token.startsWith("demo-") && !token.startsWith("local-")
      ? { Authorization: `Bearer ${token}` }
      : { "x-bypass-auth": "true", "x-bypass-role": "ADMIN" })
  }), [token]);

  const fetchSettings = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_BASE}/api/ai/settings`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        setHealth(data.health);
      } else { setError(data.message || "Failed to load settings."); }
    } catch { setError("Network error. Is the backend running?"); }
    finally { setLoading(false); }
  }, [API_BASE, getHeaders]);

  useEffect(() => { if (user) fetchSettings(); }, [user, fetchSettings]);

  // Hard redirect non-super-admins away
  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.replace("/admin/dashboard");
    }
  }, [user, router]);

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError("");
    try {
      const res  = await fetch(`${API_BASE}/api/ai/settings`, {
        method: "POST", headers: getHeaders(), body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (res.ok && data.success) { setSaved(true); setHealth(data.health); setTimeout(() => setSaved(false), 3000); }
      else setError(data.message || "Save failed.");
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true); setTestMsg(null);
    try {
      const res  = await fetch(`${API_BASE}/api/ai/test`, {
        method: "POST", headers: getHeaders()
      });
      const data = await res.json();
      setTestMsg({ ok: data.success, text: data.message });
      setHealth(data.health);
    } catch { setTestMsg({ ok: false, text: "Network error while testing connection." }); }
    finally { setTesting(false); }
  };

  if (loading || !user) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--text-accent)" }} />
    </div>
  );

  if (user.role !== "ADMIN") return null;

  const isHealthy = health?.available && health?.modelAvailable;

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-2xl">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}>
            <Brain size={16} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-accent)" }}>AI Viva</span>
        </div>
        <h1 className="text-2xl font-black font-display" style={{ color: "var(--text-primary)" }}>AI Settings</h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Configure the local LLM used for answer evaluation and session summaries.
        </p>
      </div>

      {/* Status banner */}
      <div className={`flex items-center justify-between p-4 rounded-2xl border ${
        isHealthy
          ? "bg-emerald-500/10 border-emerald-500/20"
          : health?.available
          ? "bg-amber-500/10 border-amber-500/20"
          : "bg-rose-500/10 border-rose-500/20"
      }`}>
        <div className="flex items-center space-x-3">
          {isHealthy
            ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            : health?.available
            ? <AlertCircle size={18} className="text-amber-500 shrink-0" />
            : <XCircle size={18} className="text-rose-500 shrink-0" />}
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {isHealthy
                ? `Ollama running · ${health.model} ready`
                : health?.available
                ? `Ollama running · model "${health?.model}" not pulled`
                : "Ollama not reachable"}
            </p>
            {!isHealthy && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {health?.available
                  ? `Run: ollama pull ${settings.model}`
                  : `Run: ollama serve`}
              </p>
            )}
          </div>
        </div>
        <button onClick={fetchSettings}
                className="p-2 rounded-xl hover:bg-slate-500/10 transition-all cursor-pointer"
                style={{ color: "var(--text-secondary)" }} title="Refresh status">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center space-x-3">
          <AlertCircle size={16} className="text-rose-500 shrink-0" />
          <p className="text-sm font-semibold text-rose-500">{error}</p>
        </div>
      )}

      {/* Settings form */}
      <div className="p-6 rounded-3xl border space-y-5" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
        <div className="flex items-center space-x-2 pb-1 border-b" style={{ borderColor: "var(--border-primary)" }}>
          <Settings size={15} style={{ color: "var(--text-accent)" }} />
          <h2 className="text-sm font-black" style={{ color: "var(--text-primary)" }}>Configuration</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>AI Evaluation</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              When disabled, falls back to rule-based keyword scoring.
            </p>
          </div>
          <button
            onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
            className={`relative w-12 h-6 rounded-full transition-all cursor-pointer ${settings.enabled ? "bg-indigo-500" : "bg-slate-600"}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${settings.enabled ? "left-7" : "left-1"}`} />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Model</label>
          <div className="flex gap-2">
            <select
              className="flex-1 p-3 rounded-2xl border text-sm font-semibold outline-none"
              style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
              value={PRESET_MODELS.find(m => m.value === settings.model) ? settings.model : "custom"}
              onChange={e => { if (e.target.value !== "custom") setSettings(s => ({ ...s, model: e.target.value })); }}
            >
              {PRESET_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              {!PRESET_MODELS.find(m => m.value === settings.model) && (
                <option value="custom">{settings.model} (custom)</option>
              )}
            </select>
          </div>
          <input
            className="w-full p-2 rounded-xl border text-sm outline-none font-mono"
            style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
            placeholder="Or type any model name..."
            value={settings.model}
            onChange={e => setSettings(s => ({ ...s, model: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Ollama Endpoint</label>
          <input
            className="w-full p-3 rounded-2xl border text-sm outline-none font-mono"
            style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
            value={settings.endpoint}
            onChange={e => setSettings(s => ({ ...s, endpoint: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Timeout (ms)</label>
          <input type="number"
            className="w-full p-3 rounded-2xl border text-sm outline-none"
            style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
            value={settings.timeout}
            onChange={e => setSettings(s => ({ ...s, timeout: parseInt(e.target.value) || 60000 }))}
          />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>60000ms recommended.</p>
        </div>

        <div className="pt-1 border-t space-y-3" style={{ borderColor: "var(--border-primary)" }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Sampling Parameters</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "temperature", label: "Temperature (0=deterministic)", step: "0.05", min: 0, max: 1 },
              { key: "top_p", label: "Top-P", step: "0.05", min: 0, max: 1 },
              { key: "top_k", label: "Top-K", min: 1, max: 100 },
              { key: "repeat_penalty", label: "Repeat Penalty", step: "0.05", min: 1, max: 2 },
            ].map(({ key, label, step, min, max }) => (
              <div key={key} className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</label>
                <input type="number" step={step} min={min} max={max}
                  className="w-full p-2.5 rounded-xl border text-sm outline-none"
                  style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                  value={settings[key]}
                  onChange={e => setSettings(s => ({ ...s, [key]: parseFloat(e.target.value) || s[key] }))}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleTest} disabled={testing}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl border text-sm font-bold cursor-pointer transition-all hover:scale-102 disabled:opacity-50"
                  style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
            {testing ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /><span>Testing...</span></> : <><Zap size={14} /><span>Test Connection</span></>}
          </button>
          <button onClick={handleSave} disabled={saving}
                  className="flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-2xl text-sm font-bold text-white cursor-pointer transition-all hover:scale-102 disabled:opacity-50"
                  style={{ background: "var(--accent-gradient)" }}>
            {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Saving...</span></> : saved ? <><CheckCircle2 size={14} /><span>Saved!</span></> : <><Save size={14} /><span>Save Settings</span></>}
          </button>
        </div>
      </div>

      {testMsg && (
        <div className={`p-4 rounded-2xl border flex items-start space-x-3 ${testMsg.ok ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"}`}>
          {testMsg.ok ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> : <XCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />}
          <p className={`text-sm font-semibold ${testMsg.ok ? "text-emerald-500" : "text-rose-500"}`}>{testMsg.text}</p>
        </div>
      )}

      {health?.available && health?.models?.length > 0 && (
        <div className="p-5 rounded-2xl border space-y-3" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
          <div className="flex items-center space-x-2">
            <Cpu size={14} style={{ color: "var(--text-accent)" }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Pulled Models on this Machine</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {health.models.map(m => (
              <button key={m} onClick={() => setSettings(s => ({ ...s, model: m.replace(/:latest$/, '') }))}
                      className="text-xs font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-all hover:scale-105"
                      style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}>
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 rounded-2xl border flex items-start space-x-3"
           style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
        <Info size={14} className="shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
        <div className="space-y-1">
          <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>How AI Evaluation Works</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            When a student answers a viva question, the answer is sent to the local LLM along with
            the question and relevant study material context (RAG). Returns a score (0–10), strengths,
            weaknesses, feedback, and a follow-up question. Falls back to keyword-based scoring if Ollama is unavailable.
          </p>
          <p className="text-xs font-bold mt-2" style={{ color: "var(--text-primary)" }}>Quick Start</p>
          <code className="block text-[11px] p-2 rounded-lg font-mono" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-accent)" }}>
            ollama serve{"\n"}ollama pull phi3
          </code>
        </div>
      </div>
    </div>
  );
}
