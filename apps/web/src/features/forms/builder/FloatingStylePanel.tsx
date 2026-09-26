import React from 'react';
import { FloatingPanel } from './FloatingPanel';
import './FloatingStylePanel.scss';

export interface FloatingStylePanelProps {
  isOpen: boolean;
  onClose: () => void;
  customCss: string;
  onChangeCustomCss: (css: string) => void;
}

const CSS_SNIPPETS = [
  {
    name: 'Soft Glass Cards',
    css: `/* Soft Glass Section Cards */
.canvas-section-card, .form-section-view {
  background: rgba(255, 255, 255, 0.85) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  border: 1px solid rgba(15, 23, 42, 0.08) !important;
  box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.04) !important;
}
`,
  },
  {
    name: 'Minimal Border Inputs',
    css: `/* Clean Minimal Inputs */
input, textarea, select {
  border: 1px solid rgba(15, 23, 42, 0.12) !important;
  border-radius: 6px !important;
  background: #ffffff !important;
  transition: all 0.15s ease !important;
}
input:focus, textarea:focus, select:focus {
  border-color: #4f46e5 !important;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1) !important;
}
`,
  },
  {
    name: 'Indigo Primary Button',
    css: `/* Solid Indigo Action Button */
button[type="submit"], .btn-primary {
  background: #4f46e5 !important;
  border: 1px solid #4f46e5 !important;
  color: #ffffff !important;
  font-weight: 600 !important;
  border-radius: 6px !important;
  box-shadow: 0 1px 3px rgba(79, 70, 229, 0.25) !important;
}
`,
  },
  {
    name: 'Emerald Accent',
    css: `/* Subtle Emerald Accent */
.form-title {
  color: #059669 !important;
}
input:focus, textarea:focus {
  border-color: #059669 !important;
  box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.15) !important;
}
`,
  },
];

export const FloatingStylePanel: React.FC<FloatingStylePanelProps> = ({
  isOpen,
  onClose,
  customCss,
  onChangeCustomCss,
}) => {
  const handleApplySnippet = (snippetCss: string) => {
    if (!customCss.trim()) {
      onChangeCustomCss(snippetCss.trim());
    } else {
      onChangeCustomCss(`${customCss.trim()}\n\n${snippetCss.trim()}`);
    }
  };

  return (
    <FloatingPanel
      title="Style Properties"
      icon="palette"
      isOpen={isOpen}
      onClose={onClose}
      width={420}
      defaultPosition={{ x: Math.round(window.innerWidth / 2 - 210), y: window.innerHeight - 560 }}
    >
      <div className="style-panel-content">
        <div className="style-panel-info">
          <span className="material-icon">auto_fix_high</span>
          <span>
            Styles are scoped exclusively to this form and update the canvas and preview in real
            time.
          </span>
        </div>

        {/* Quick Style Snippets */}
        <div className="style-panel-snippets">
          <span className="style-panel-snippets__label">Quick Presets</span>
          <div className="style-panel-snippets__list">
            {CSS_SNIPPETS.map((snip) => (
              <button
                key={snip.name}
                type="button"
                className="style-panel-snippets__chip"
                onClick={() => handleApplySnippet(snip.css)}
                title="Add this CSS snippet to the editor"
              >
                + {snip.name}
              </button>
            ))}
          </div>
        </div>

        {/* CSS Code Editor */}
        <div className="style-panel-editor">
          <div className="style-panel-editor__header">
            <span>Custom Scoped CSS</span>
            <span>{customCss.length} chars</span>
          </div>
          <textarea
            className="style-panel-editor__textarea"
            value={customCss}
            onChange={(e) => onChangeCustomCss(e.target.value)}
            placeholder={`/* Example custom scoped CSS */\n.form-title {\n  color: #38bdf8;\n  font-size: 24px;\n}\n\ninput {\n  border-radius: 8px;\n}`}
            spellCheck={false}
          />
        </div>

        <div className="style-panel-footer">
          <div className="style-panel-live-pill">
            <span className="dot" />
            <span>Live visual feedback active</span>
          </div>
          {customCss && (
            <button type="button" onClick={() => onChangeCustomCss('')}>
              Clear CSS
            </button>
          )}
        </div>
      </div>
    </FloatingPanel>
  );
};
