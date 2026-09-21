'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Settings,
  Trash2,
  Save,
  Globe,
  Layers,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface ProjectData {
  id: string;
  name: string;
  domain: string;
  url: string;
  crawlLimit: number;
}

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [name, setName] = useState('');
  const [crawlLimit, setCrawlLimit] = useState(100);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    async function loadProject() {
      try {
        setLoading(true);
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setProject(json.data);
            setName(json.data.name);
            setCrawlLimit(json.data.crawlLimit || 100);
          }
        }
      } catch (err) {
        console.error('Failed to load project:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [projectId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, crawlLimit: Number(crawlLimit) }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save project:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="mt-3 text-sm text-neutral-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Project Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage crawl boundary configurations, project identity, and digital twin limits.
        </p>
      </div>

      {/* General Settings Form */}
      <form onSubmit={handleSave} className="rounded-xl border border-neutral-200/80 bg-white p-6 shadow-xs space-y-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">General Configuration</h2>

        <div>
          <label className="block text-xs font-semibold text-neutral-700">Project Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700">Domain / Base URL</label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-sm text-neutral-500">
            <Globe size={16} />
            <span>{project?.url}</span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-400">
            Target domain cannot be modified once initialized. To crawl a different host, create a new project.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700">Max Crawl Page Cap</label>
          <select
            value={crawlLimit}
            onChange={(e) => setCrawlLimit(Number(e.target.value))}
            className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          >
            <option value={50}>50 pages (Fast)</option>
            <option value={100}>100 pages (Recommended)</option>
            <option value={250}>250 pages (Deep)</option>
            <option value={500}>500 pages (Full)</option>
          </select>
          <p className="mt-1 text-[11px] text-neutral-400">
            Upper ceiling of internal nodes discovered before the crawler ceases BFS exploration.
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-100 pt-5">
          {saveSuccess ? (
            <span className="text-xs font-medium text-emerald-600">Settings saved successfully!</span>
          ) : (
            <span />
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="rounded-xl border border-rose-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 text-rose-600">
          <AlertTriangle size={18} />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Danger Zone</h2>
        </div>
        <p className="mt-2 text-xs text-neutral-600">
          Permanently delete this project, all associated crawl graphs, issues, page audits, and public share links. This action cannot be undone.
        </p>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
          >
            <Trash2 size={14} />
            {deleting
              ? 'Deleting...'
              : deleteConfirm
              ? 'Are you sure? Click to Confirm Delete'
              : 'Delete Project'}
          </button>
          {deleteConfirm && (
            <button
              type="button"
              onClick={() => setDeleteConfirm(false)}
              className="text-xs text-neutral-500 hover:text-neutral-900"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
