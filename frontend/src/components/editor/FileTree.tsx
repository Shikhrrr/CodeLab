import { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  File,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import type { ProjectFile } from '../../types';

// ─── Tree data model ──────────────────────────────────────────────────────────

interface TreeFile {
  kind: 'file';
  name: string;
  file: ProjectFile;
}

interface TreeFolder {
  kind: 'folder';
  name: string;
  children: TreeNode[];
}

type TreeNode = TreeFile | TreeFolder;

// ─── Flat-path → nested tree builder ─────────────────────────────────────────

function buildTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeFolder = { kind: 'folder', name: '__root__', children: [] };

  for (const file of files) {
    const parts = file.path.replace(/^\//, '').split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (isLast) {
        current.children.push({ kind: 'file', name: part, file });
      } else {
        let folder = current.children.find(
          (c): c is TreeFolder => c.kind === 'folder' && c.name === part,
        );
        if (!folder) {
          folder = { kind: 'folder', name: part, children: [] };
          current.children.push(folder);
        }
        current = folder;
      }
    }
  }

  // Sort: folders first, then files, both alphabetically
  function sort(nodes: TreeNode[]): TreeNode[] {
    return [...nodes].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).map((n) => (n.kind === 'folder' ? { ...n, children: sort(n.children) } : n));
  }

  return sort(root.children);
}

// ─── File icon by extension ───────────────────────────────────────────────────

function FileIcon({ name, size = 13 }: { name: string; size?: number }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const props = { size, strokeWidth: 2 };

  if (['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs'].includes(ext))
    return <FileCode {...props} />;
  if (['json'].includes(ext))
    return <FileJson {...props} />;
  if (['md', 'mdx', 'txt'].includes(ext))
    return <FileText {...props} />;
  return <File {...props} />;
}

// ─── Tree node renderer ───────────────────────────────────────────────────────

interface NodeRowProps {
  node: TreeNode;
  depth: number;
  activeFileId: string | null;
  onSelect: (file: ProjectFile) => void;
  defaultOpen?: boolean;
}

function NodeRow({ node, depth, activeFileId, onSelect, defaultOpen = false }: NodeRowProps) {
  const [open, setOpen] = useState(defaultOpen);
  const indent = depth * 12;

  if (node.kind === 'file') {
    const isActive = activeFileId === node.file.id;
    return (
      <button
        type="button"
        onClick={() => onSelect(node.file)}
        style={{ paddingLeft: 8 + indent }}
        className={[
          'flex w-full items-center gap-1.5 py-[3px] pr-2 text-left font-mono text-[11px] transition-colors',
          isActive
            ? 'border-y border-[#121212] bg-[#FFE814] font-black text-[#121212]'
            : 'text-[#333] hover:bg-[#F0EFE9]',
        ].join(' ')}
      >
        <FileIcon name={node.name} />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  // Folder
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ paddingLeft: 6 + indent }}
        className="flex w-full items-center gap-1 py-[3px] pr-2 text-left font-mono text-[11px] font-bold text-[#121212] hover:bg-[#F0EFE9]"
      >
        {open ? <ChevronDown size={11} strokeWidth={3} /> : <ChevronRight size={11} strokeWidth={3} />}
        {open
          ? <FolderOpen size={13} strokeWidth={2} className="text-[#FF8C42]" />
          : <Folder size={13} strokeWidth={2} className="text-[#FF8C42]" />}
        <span className="truncate uppercase tracking-wide">{node.name}</span>
      </button>

      {open && node.children.map((child, i) => (
        <NodeRow
          key={child.kind === 'file' ? child.file.id : `${child.name}-${i}`}
          node={child}
          depth={depth + 1}
          activeFileId={activeFileId}
          onSelect={onSelect}
          defaultOpen={false}
        />
      ))}
    </>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface FileTreeProps {
  files: ProjectFile[];
  activeFileId: string | null;
  onSelectFile: (file: ProjectFile) => void;
}

export default function FileTree({ files: rawFiles, activeFileId, onSelectFile }: FileTreeProps) {
  const files = Array.isArray(rawFiles) ? rawFiles : [];
  const tree = useMemo(() => buildTree(files), [files]);

  if (files.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 font-mono text-[11px] text-[#999]">
        No files generated yet.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {tree.map((node, i) => (
        <NodeRow
          key={node.kind === 'file' ? node.file.id : `${node.name}-${i}`}
          node={node}
          depth={0}
          activeFileId={activeFileId}
          onSelect={onSelectFile}
          defaultOpen={node.kind === 'folder'}
        />
      ))}
    </div>
  );
}
