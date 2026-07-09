"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, FileText, Globe, Trash2, RefreshCw, File } from "lucide-react";

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

export function KnowledgeClient({ projectId }: { projectId: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("text");
  const [textName, setTextName] = useState("");
  const [textContent, setTextContent] = useState("");
  const [url, setUrl] = useState("");
  const [crawlName, setCrawlName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (projectId) {
      fetchSources(projectId);
    }
  }, [projectId]);

  async function fetchSources(pid: string) {
    try {
      const res = await fetch(`/api/knowledge/sources?projectId=${pid}`);
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
    if (!projectId || !textName || !textContent) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/knowledge/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
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
        fetchSources(projectId);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to add knowledge" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to add knowledge" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDocumentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !selectedFile || !docName) return;

    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("projectId", projectId);
      formData.append("name", docName);

      const res = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: `Added ${data.data.chunksCreated} chunks from ${data.data.filename}` });
        setSelectedFile(null);
        setDocName("");
        fetchSources(projectId);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to upload document" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to upload document" });
    } finally {
      setLoading(false);
    }
  }

  async function handleCrawlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !url || !crawlName) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/knowledge/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          url,
          name: crawlName
        })
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: `Crawled ${data.data.pagesVisited} pages, added ${data.data.chunksCreated} chunks` });
        setUrl("");
        setCrawlName("");
        fetchSources(projectId);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to crawl website" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to crawl website" });
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

      if (data.success && projectId) {
        fetchSources(projectId);
      }
    } catch (error) {
      console.error("Failed to delete source:", error);
    }
  }

  function handleFileSelect(file: File) {
    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    const allowedExtensions = [".pdf", ".docx", ".txt"];

    const isValidType = allowedTypes.includes(file.type) ||
      allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isValidType) {
      setMessage({ type: "error", text: "Only PDF, DOCX, and TXT files are supported" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: "error", text: "File size exceeds 10MB limit" });
      return;
    }

    setSelectedFile(file);
    setDocName(file.name.replace(/\.[^/.]+$/, ""));
    setMessage(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function getSourceIcon(type: string) {
    switch (type) {
      case "TEXT":
        return <FileText className="w-5 h-5 text-gray-400" />;
      case "DOCUMENT":
        return <File className="w-5 h-5 text-gray-400" />;
      case "URL":
        return <Globe className="w-5 h-5 text-gray-400" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <p className="text-gray-500">Add content to power your AI chatbot responses.</p>
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
              disabled={loading || !projectId}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add to Knowledge Base"}
            </button>
          </form>
        )}

        {activeTab === "document" && (
          <form onSubmit={handleDocumentSubmit} className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`py-12 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isDragOver
                  ? "border-purple-500 bg-purple-50"
                  : selectedFile
                  ? "border-green-300 bg-green-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />
              {selectedFile ? (
                <>
                  <FileText className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <p className="text-green-700 font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-green-600 mt-1">Click to change file</p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Drag and drop PDF, DOCX, or TXT files</p>
                  <p className="text-sm text-gray-400 mt-2">or click to select</p>
                </>
              )}
            </div>

            {selectedFile && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="Document name"
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !projectId}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
                >
                  {loading ? "Extracting and indexing..." : "Upload Document"}
                </button>
              </>
            )}
          </form>
        )}

        {activeTab === "url" && (
          <form onSubmit={handleCrawlSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Website URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={crawlName}
                onChange={(e) => setCrawlName(e.target.value)}
                placeholder="e.g. Company Website"
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !projectId}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? "Crawling website... this may take 30-60 seconds" : "Crawl Website"}
            </button>
          </form>
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
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Knowledge Sources</h2>
          <button
            onClick={() => projectId && fetchSources(projectId)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="Refresh sources"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
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
                  {getSourceIcon(source.type)}
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
