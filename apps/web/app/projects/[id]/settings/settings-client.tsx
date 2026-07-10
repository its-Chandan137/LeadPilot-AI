"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Pencil, ArrowRight } from "lucide-react";
import { DeleteProjectWarning } from "@/components/popups/delete-project-warning";
import { DeleteProjectConfirm } from "@/components/popups/delete-project-confirm";

type Project = {
  id: string;
  name: string;
  siteUrl: string;
};

type Props = {
  project: Project;
};

export function SettingsClient({ project }: Props) {
  const router = useRouter();

  const [currentName, setCurrentName] = useState(project.name);
  const [nameEditing, setNameEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(project.name);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSaved, setNameSaved] = useState(false);

  const [currentSiteUrl, setCurrentSiteUrl] = useState(project.siteUrl);
  const [urlEditing, setUrlEditing] = useState(false);
  const [urlDraft, setUrlDraft] = useState(project.siteUrl);
  const [urlSaving, setUrlSaving] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [urlSaved, setUrlSaved] = useState(false);

  const [showWarning, setShowWarning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleNameEdit() {
    setNameDraft(currentName);
    setNameEditing(true);
    setNameError("");
    setNameSaved(false);
  }

  function handleNameCancel() {
    setNameDraft(currentName);
    setNameEditing(false);
    setNameError("");
  }

  async function handleNameSave() {
    setNameSaving(true);
    setNameError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameDraft }),
      });
      const json = await res.json();
      if (json.success) {
        setCurrentName(nameDraft);
        setNameSaved(true);
        setNameEditing(false);
        router.refresh();
        setTimeout(() => setNameSaved(false), 2000);
      } else {
        setNameError(json.error ?? "Failed to save");
      }
    } catch {
      setNameError("Failed to save");
    } finally {
      setNameSaving(false);
    }
  }

  function handleUrlEdit() {
    setUrlDraft(currentSiteUrl);
    setUrlEditing(true);
    setUrlError("");
    setUrlSaved(false);
  }

  function handleUrlCancel() {
    setUrlDraft(currentSiteUrl);
    setUrlEditing(false);
    setUrlError("");
  }

  async function handleUrlSave() {
    setUrlSaving(true);
    setUrlError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl: urlDraft }),
      });
      const json = await res.json();
      if (json.success) {
        setCurrentSiteUrl(urlDraft);
        setUrlSaved(true);
        setUrlEditing(false);
      } else {
        setUrlError(json.error ?? "Failed to save");
      }
    } catch {
      setUrlError("Failed to save");
    } finally {
      setUrlSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        router.push("/projects");
      } else {
        setDeleteError(json.error ?? "Failed to delete project");
        setIsDeleting(false);
      }
    } catch {
      setDeleteError("Failed to delete project");
      setIsDeleting(false);
    }
  }

  function handleWarningConfirm() {
    setShowWarning(false);
    setShowConfirm(true);
  }

  function handleCancelDelete() {
    setShowWarning(false);
    setShowConfirm(false);
    setDeleteError(null);
  }

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Project Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your project settings and preferences.</p>
        </div>

        {/* Section 1 — General Settings */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">General Settings</h2>
            <p className="text-sm text-slate-500">Update your project details.</p>
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Project Name</label>
            {nameEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="max-w-xs"
                />
                <button
                  onClick={handleNameSave}
                  disabled={nameSaving}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
                >
                  {nameSaving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={handleNameCancel}
                  disabled={nameSaving}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-900">{currentName}</span>
                <button
                  onClick={handleNameEdit}
                  className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition hover:text-violet-600 hover:bg-violet-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {nameSaved && (
              <p className="mt-1 text-sm text-emerald-600">Saved</p>
            )}
            {nameError && (
              <p className="mt-1 text-sm text-red-600">{nameError}</p>
            )}
          </div>

          {/* Project URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Project URL</label>
            {urlEditing && (
              <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs text-amber-800">
                  Changing your site URL means you&apos;ll need to re-embed your widget snippet on the new site.
                </p>
              </div>
            )}
            {urlEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  placeholder="https://yoursite.com"
                  className="max-w-xs"
                />
                <button
                  onClick={handleUrlSave}
                  disabled={urlSaving}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
                >
                  {urlSaving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={handleUrlCancel}
                  disabled={urlSaving}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-900">{currentSiteUrl || "Not set"}</span>
                <button
                  onClick={handleUrlEdit}
                  className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition hover:text-violet-600 hover:bg-violet-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1">
              Enter your website domain only — e.g. https://yoursite.com or http://localhost:5501
            </p>
            {urlError && (
              <p className="mt-1 text-sm text-red-600">{urlError}</p>
            )}
            {urlSaved && (
              <div className="mt-3 rounded-md border border-green-700 bg-green-950 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-green-400">
                    Site URL updated. Don&apos;t forget to re-embed your snippet on the new site.
                  </p>
                  <Link
                    href={`/projects/${project.id}/widget-settings?tab=snippet`}
                    className="ml-4 inline-flex items-center gap-1 text-sm font-medium text-green-400 hover:text-green-300 whitespace-nowrap"
                  >
                    View Snippet
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2 — Danger Zone */}
        <div className="rounded-xl border border-red-300 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-red-600">Delete Project</h2>
            <p className="text-sm text-slate-600">
              Permanently delete this project and all its data including conversations, leads, and knowledge base. This action cannot be undone.
            </p>
            <button
              onClick={() => setShowWarning(true)}
              className="inline-flex h-10 items-center justify-center rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Delete Project
            </button>
          </div>
        </div>
      </div>

      {showWarning && (
        <DeleteProjectWarning
          projectName={currentName}
          onConfirm={handleWarningConfirm}
          onCancel={handleCancelDelete}
        />
      )}

      {showConfirm && (
        <DeleteProjectConfirm
          projectName={currentName}
          onConfirm={handleDelete}
          onCancel={handleCancelDelete}
          isDeleting={isDeleting}
        />
      )}

      {deleteError && (
        <p className="text-sm text-red-600 mt-2">{deleteError}</p>
      )}
    </>
  );
}
