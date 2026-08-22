import { create } from 'zustand';
import type { ProjectFile } from '../types';

// ─── State shape ─────────────────────────────────────────────────────────────

interface ProjectState {
  files: ProjectFile[];
  activeFileId: string | null;
  /** In-memory edits keyed by fileId. Diverges from `files` until saved. */
  fileBuffers: Record<string, string>;
  isGenerating: boolean;
  currentJobId: string | null;
  generationError: string | null;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

interface ProjectActions {
  setFiles(files: ProjectFile[]): void;
  setActiveFileId(fileId: string | null): void;
  /** Update the unsaved local buffer for a file (typing in the editor). */
  updateFileBuffer(fileId: string, content: string): void;
  /**
   * Persist buffer content back into the canonical file list.
   * Call this after a successful PUT /files/{fileId}/ response.
   */
  commitFileContent(fileId: string, content: string): void;
  setIsGenerating(isGenerating: boolean): void;
  setCurrentJobId(jobId: string | null): void;
  setGenerationError(error: string | null): void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

const useProjectStore = create<ProjectState & ProjectActions>()((set) => ({
  // Initial state
  files: [],
  activeFileId: null,
  fileBuffers: {},
  isGenerating: false,
  currentJobId: null,
  generationError: null,

  // Actions
  setFiles: (files) => set({ files, fileBuffers: {} }),

  setActiveFileId: (fileId) => set({ activeFileId: fileId }),

  updateFileBuffer: (fileId, content) =>
    set((state) => ({
      fileBuffers: { ...state.fileBuffers, [fileId]: content },
    })),

  commitFileContent: (fileId, content) =>
    set((state) => ({
      // Sync the canonical file list so readers always see the latest persisted content
      files: state.files.map((f) =>
        f.id === fileId ? { ...f, content, updated_at: new Date().toISOString() } : f,
      ),
      // Clear the dirty buffer — file and buffer are now in sync
      fileBuffers: Object.fromEntries(
        Object.entries(state.fileBuffers).filter(([id]) => id !== fileId),
      ),
    })),

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  setCurrentJobId: (jobId) => set({ currentJobId: jobId }),

  setGenerationError: (error) => set({ generationError: error }),
}));

export default useProjectStore;
