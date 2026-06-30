"use client";

import { useState, useEffect } from "react";
import { Upload, FileText, Globe, Trash2 } from "lucide-react";

type Project = {
  id: string;
  name: string;
};

type KnowledgeSource = {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
  _count: {
    chunks: number;
  };
};

type Tab = "text" | "document" | "url";

export function KnowledgeClient({ projects }: { projects: Project[] }) {
  const [selectedProject, setSelectedProject] = useState<string>(projects[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<Tab>("text");
  const [textName, setTextName] = useState("");
  const [textContent, setTextContent] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);

  useEffect(() => {
    if (selectedProject) {
      fetchSources(selectedProject);
    }
  }, [selectedProject]);

  async function fetchSources(projectId: string) {
    try {
      const res = await fetch(`/api/knowledge/sources?projectId=${projectId}`);
      const data = await res.json();
      if (data.success) {
        setSources(data.data.sources);
      }
    } catch (error) {
      console.error("Failed to fetch sources:", error);
    }
  }

  async function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProject || !textName || !textContent) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/knowledge/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject,
          type: "TEXT",
          name: textName,
          content: textContent
        })
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: `Added ${data.data.chunksCreated} chunks to knowledge base` });
        setTextName("");
        setTextContent("");
        fetchSources(selectedProject);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to add knowledge" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to add knowledge" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(sourceId: string) {
    if (!confirm("Are you sure you want to delete this source?")) return;

    try {
      const res = await fetch(`/api/knowledge/sources?id=${sourceId}`, {
        method: "DELETE"
      });

      const data = await res.json();

      if (data.success && selectedProject) {
        fetchSources(selectedProject);
      }
    } catch (error) {
      console.error("Failed to delete source:", error);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <p className="text-gray-500">Add content to power your AI chatbot responses.</p>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Project:</label>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <div className="flex gap-2 mb-4 border-b">
          <button
            onClick={() => setActiveTab("text")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === "text"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-500"
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Paste Text
          </button>
          <button
            onClick={() => setActiveTab("document")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === "document"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-500"
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Upload Document
            <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">Coming Soon</span>
          </button>
          <button
            onClick={() => setActiveTab("url")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === "url"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-500"
            }`}
          >
            <Globe className="w-4 h-4 inline mr-2" />
            Website URL
            <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">Coming Soon</span>
          </button>
        </div>

        {activeTab === "text" && (
          <form onSubmit={handleTextSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={textName}
                onChange={(e) => setTextName(e.target.value)}
                placeholder="e.g. About Us, FAQ, Pricing"
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Content</label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste your business description, FAQs, product info..."
                rows={8}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !selectedProject}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add to Knowledge Base"}
            </button>
          </form>
        )}

        {activeTab === "document" && (
          <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-lg">
            <Upload className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Drag and drop PDF, DOCX, or TXT files</p>
            <p className="text-sm text-gray-400 mt-2">Coming Soon</p>
            <button disabled className="mt-4 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed">
              Upload
            </button>
          </div>
        )}

        {activeTab === "url" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Website URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <button disabled className="px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed">
              Crawl Website
              <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-500 rounded">Coming Soon</span>
            </button>
          </div>
        )}

        {message && (
          <div className={`mt-4 p-3 rounded-lg ${
            message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Knowledge Sources</h2>
        </div>
        {sources.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No knowledge added yet
          </div>
        ) : (
          <div className="divide-y">
            {sources.map((source) => (
              <div key={source.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{source.name}</p>
                    <p className="text-sm text-gray-500">
                      {source.type} · {source._count.chunks} chunks · {new Date(source.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    source.status === "READY" ? "bg-green-100 text-green-700" :
                    source.status === "PROCESSING" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {source.status}
                  </span>
                  <button
                    onClick={() => handleDelete(source.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
