import React, { useState, useMemo } from 'react';

interface FileExplorerProps {
  files: string[];
  onScan: (selectedFiles: string[]) => void;
  onCancel: () => void;
  isScanning: boolean;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ files, onScan, onCancel, isScanning }) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set(files.slice(0, 50)));
  const [scanMode, setScanMode] = useState<'whole' | 'select'>('whole');

  const handleToggle = (file: string) => {
    const next = new Set(selectedFiles);
    if (next.has(file)) {
      next.delete(file);
    } else {
      if (next.size >= 50) {
        alert("Maximum 50 files allowed per batch scan.");
        return;
      }
      next.add(file);
    }
    setSelectedFiles(next);
  };

  const handleSelectAll = () => {
    setSelectedFiles(new Set(files.slice(0, 50)));
  };

  const handleDeselectAll = () => {
    setSelectedFiles(new Set());
  };

  const startScan = () => {
    if (scanMode === 'whole') {
      onScan(files.slice(0, 50));
    } else {
      onScan(Array.from(selectedFiles));
    }
  };

  // Group files by top-level directory for easier viewing
  const groupedFiles = useMemo(() => {
    const groups: Record<string, string[]> = { Root: [] };
    files.forEach(f => {
      const parts = f.split('/');
      if (parts.length === 1) {
        groups.Root.push(f);
      } else {
        const dir = parts[0];
        if (!groups[dir]) groups[dir] = [];
        groups[dir].push(f);
      }
    });
    return groups;
  }, [files]);

  return (
    <div className="file-explorer" style={{
      background: 'var(--bg-card)',
      border: 'var(--border-card)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-xl)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-lg)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Configure Scan</h3>
        <button 
          onClick={onCancel} 
          disabled={isScanning} 
          title="Close"
          style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            color: '#ef4444', 
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            outline: 'none'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#ef4444';
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = '#ef4444';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            e.currentTarget.style.color = '#ef4444';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
        <button 
          onClick={() => setScanMode('whole')}
          style={{ 
            flex: 1, 
            padding: 'var(--space-md)', 
            background: scanMode === 'whole' ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-surface)',
            border: scanMode === 'whole' ? '1px solid var(--accent-cyan)' : 'var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: scanMode === 'whole' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Whole Repository</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Automatically scans up to 50 valid code files.</div>
        </button>
        <button 
          onClick={() => setScanMode('select')}
          style={{ 
            flex: 1, 
            padding: 'var(--space-md)', 
            background: scanMode === 'select' ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-surface)',
            border: scanMode === 'select' ? '1px solid var(--accent-cyan)' : 'var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: scanMode === 'select' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Select Folders/Files</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Manually pick which files to include in the batch.</div>
        </button>
      </div>

      {scanMode === 'select' && (
        <div style={{ border: 'var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-surface)', borderBottom: 'var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {selectedFiles.size} / 50 files selected
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button onClick={handleSelectAll} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.85rem' }}>Select All</button>
              <button onClick={handleDeselectAll} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>Clear</button>
            </div>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', padding: 'var(--space-md)' }}>
            {Object.entries(groupedFiles).map(([group, groupFiles]) => (
              <div key={group} style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-sm)', fontSize: '0.9rem' }}>
                  {group === 'Root' ? '/' : `/${group}`}
                </div>
                {groupFiles.map(file => (
                  <label key={file} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: '4px 8px', cursor: 'pointer', borderRadius: '4px', ':hover': { background: 'var(--bg-surface)' } } as any}>
                    <input 
                      type="checkbox" 
                      checked={selectedFiles.has(file)} 
                      onChange={() => handleToggle(file)}
                      disabled={!selectedFiles.has(file) && selectedFiles.size >= 50}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                      {group === 'Root' ? file : file.replace(`${group}/`, '')}
                    </span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <button 
        className="btn-primary" 
        onClick={startScan} 
        disabled={isScanning || (scanMode === 'select' && selectedFiles.size === 0)}
        style={{ width: '100%', padding: 'var(--space-md)', fontSize: '1rem' }}
      >
        {isScanning ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span className="scan-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            Starting Scan...
          </span>
        ) : (
          `Start AI Batch Scan (${scanMode === 'whole' ? Math.min(files.length, 50) : selectedFiles.size} files)`
        )}
      </button>
    </div>
  );
};
