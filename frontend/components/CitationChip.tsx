/**
 * Component: CitationChip
 * Displays a file:line reference as a clickable chip.
 * Clicking opens the CodeViewer at that exact line.
 *
 * Props:
 *   file:       string  — relative file path (e.g., "src/auth/middleware.py")
 *   startLine:  number  — start line number
 *   endLine:    number  — end line number
 *   onClick:    handler — opens CodeViewer at this location
 *
 * Phase 2 — Week 4 implementation.
 */

interface CitationChipProps {
  file: string;
  startLine: number;
  endLine: number;
  onClick?: () => void;
}

// TODO: Phase 2 Week 4 — styled chip with hover state
export default function CitationChip({ file, startLine, endLine, onClick }: CitationChipProps) {
  return (
    <button onClick={onClick} className="citation-chip">
      {file}:{startLine}-{endLine}
    </button>
  );
}
