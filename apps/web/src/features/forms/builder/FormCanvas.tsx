import React, { useState } from 'react';
import { FormElement, FormElementType } from '@saas/shared';
import {
  Button,
  Badge,
  FormField,
  FormLabel,
  Input,
  FieldElement,
} from '../../../components';
import './FormCanvas.scss';

export interface FormCanvasProps {
  elements: FormElement[];
  onChange: (elements: FormElement[]) => void;
  onAddElementType: (type: FormElementType, targetIndex?: number) => void;
}

export const FormCanvas: React.FC<FormCanvasProps> = ({
  elements,
  onChange,
  onAddElementType,
}) => {
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isPaletteOverCanvas, setIsPaletteOverCanvas] = useState(false);

  // Reorder elements
  const handleMove = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= elements.length) return;
    const updated = [...elements];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onChange(updated);
  };

  // Remove element
  const handleRemove = (id: string) => {
    const updated = elements.filter((el) => el.id !== id);
    if (editingElementId === id) {
      setEditingElementId(null);
    }
    onChange(updated);
  };

  // Update specific field properties
  const handleUpdateProperty = (id: string, updates: Partial<FormElement>) => {
    const updated = elements.map((el) => (el.id === id ? { ...el, ...updates } : el));
    onChange(updated);
  };

  // Toggle width (6 vs 12)
  const handleToggleColSpan = (id: string) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    const nextCol = (el.colSpan || 12) === 12 ? 6 : 12;
    handleUpdateProperty(id, { colSpan: nextCol });
  };

  // Canvas Drag & Drop handlers
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsPaletteOverCanvas(true);
  };

  const handleCanvasDragLeave = () => {
    setIsPaletteOverCanvas(false);
  };

  const handleCanvasDrop = (e: React.DragEvent, dropTargetIndex?: number) => {
    e.preventDefault();
    setIsPaletteOverCanvas(false);
    setDragOverIndex(null);

    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;

    try {
      const data = JSON.parse(rawData);

      // Dropping an item from Palette
      if (data.action === 'create' && data.type) {
        onAddElementType(data.type, dropTargetIndex ?? elements.length);
        return;
      }

      // Reordering an existing element inside the canvas
      if (data.action === 'reorder' && typeof data.index === 'number') {
        const target = dropTargetIndex !== undefined ? dropTargetIndex : elements.length - 1;
        handleMove(data.index, target);
      }
    } catch {
      // Ignore parse error
    }
  };

  const handleItemDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.setData('application/json', JSON.stringify({ action: 'reorder', index }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleItemDragEnd = () => {
    setDraggedItemIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: '260px',
        padding: 'var(--space-4)',
        backgroundColor: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
      }}
      onDragOver={handleCanvasDragOver}
      onDragLeave={handleCanvasDragLeave}
      onDrop={(e) => handleCanvasDrop(e)}
    >
      {elements.length === 0 ? (
        <div
          style={{
            border: isPaletteOverCanvas
              ? '2px dashed var(--color-primary)'
              : '2px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-12) var(--space-4)',
            textAlign: 'center',
            backgroundColor: isPaletteOverCanvas
              ? 'rgba(99, 102, 241, 0.05)'
              : 'transparent',
            transition: 'all var(--transition-fast)',
          }}
          id="canvas-empty-state"
        >
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <span className="material-icon" style={{ fontSize: '48px', color: 'var(--color-text-muted)' }}>
              description
            </span>
          </div>
          <h3
            style={{
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-semibold)',
              margin: '0 0 var(--space-1) 0',
              color: 'var(--color-text-primary)',
            }}
          >
            No Form Elements Yet
          </h3>
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-muted)',
              margin: 0,
            }}
          >
            Drag elements from the left panel onto this grid, or click an element to add it.
          </p>
        </div>
      ) : (
        <div className="form-canvas-grid">
          {elements.map((element, index) => {
            const isEditing = editingElementId === element.id;
            const isDragging = draggedItemIndex === index;
            const isDragOver = dragOverIndex === index;
            const colSpan = element.colSpan || 12;

            return (
              <div
                key={element.id}
                id={`canvas-element-${element.id}`}
                className={`canvas-element-card ${isEditing ? 'canvas-element-card--selected' : ''} ${
                  isDragging ? 'canvas-element-card--dragging' : ''
                }`}
                style={{
                  gridColumn: `span ${colSpan}`,
                  borderColor: isDragOver ? 'var(--color-primary)' : undefined,
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverIndex(index);
                }}
                onDragLeave={() => {
                  if (dragOverIndex === index) setDragOverIndex(null);
                }}
                onDrop={(e) => {
                  e.stopPropagation();
                  handleCanvasDrop(e, index);
                }}
              >
                {/* Element Header Bar (Controls) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-3)',
                    paddingBottom: 'var(--space-2)',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  {/* Left: Drag Handle and Type Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span
                      draggable
                      onDragStart={(e) => handleItemDragStart(e, index)}
                      onDragEnd={handleItemDragEnd}
                      title="Drag to reposition element"
                      style={{
                        cursor: 'grab',
                        padding: 'var(--space-1)',
                        color: 'var(--color-text-muted)',
                        fontSize: 'var(--font-size-base)',
                        userSelect: 'none',
                      }}
                    >
                      ⠿
                    </span>
                    <Badge variant="neutral" size="small">
                      {element.type.toUpperCase()}
                    </Badge>
                    <span
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      #{index + 1}
                    </span>
                  </div>

                  {/* Right: Actions (Width toggle, Settings, Move, Delete) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                    {/* Width Toggle: 12 (Full) or 6 (Half) */}
                    <button
                      type="button"
                      onClick={() => handleToggleColSpan(element.id)}
                      id={`toggle-width-${element.id}`}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '2px 6px',
                        fontSize: '11px',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                      }}
                      title="Toggle grid width: Full (12 cols) / Half (6 cols)"
                    >
                      {colSpan === 12 ? 'Full Width (12)' : 'Half Width (6)'}
                    </button>

                    {/* Move Up Button */}
                    <button
                      type="button"
                      onClick={() => handleMove(index, index - 1)}
                      disabled={index === 0}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: index === 0 ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                        cursor: index === 0 ? 'default' : 'pointer',
                        padding: '2px 4px',
                        fontSize: '12px',
                      }}
                      title="Move up"
                    >
                      <span className="material-icon" style={{ fontSize: '16px' }}>arrow_upward</span>
                    </button>

                    {/* Move Down Button */}
                    <button
                      type="button"
                      onClick={() => handleMove(index, index + 1)}
                      disabled={index === elements.length - 1}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color:
                          index === elements.length - 1
                            ? 'var(--color-text-muted)'
                            : 'var(--color-text-primary)',
                        cursor: index === elements.length - 1 ? 'default' : 'pointer',
                        padding: '2px 4px',
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                      title="Move down"
                    >
                      <span className="material-icon" style={{ fontSize: '16px' }}>arrow_downward</span>
                    </button>

                    {/* Configure Settings Toggle */}
                    <Button
                      variant={isEditing ? 'primary' : 'ghost'}
                      size="small"
                      onClick={() => setEditingElementId(isEditing ? null : element.id)}
                      id={`edit-settings-${element.id}`}
                      style={{ padding: '2px 8px', fontSize: '12px' }}
                    >
                      {isEditing ? 'Done' : 'Edit'}
                    </Button>

                    {/* Remove Element Button */}
                    <button
                      type="button"
                      onClick={() => handleRemove(element.id)}
                      id={`remove-element-${element.id}`}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-danger)',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        fontSize: '14px',
                        lineHeight: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                      title="Remove field"
                    >
                      <span className="material-icon" style={{ fontSize: '16px' }}>close</span>
                    </button>
                  </div>
                </div>

                {/* Inline Element Editor (when expanded) */}
                {isEditing && (
                  <div
                    style={{
                      padding: 'var(--space-3)',
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: 'var(--space-3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-3)',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                      <FormField style={{ margin: 0 }}>
                        <FormLabel htmlFor={`label-${element.id}`}>Field Label</FormLabel>
                        <Input
                          id={`label-${element.id}`}
                          value={element.label}
                          onChange={(e) =>
                            handleUpdateProperty(element.id, { label: e.target.value })
                          }
                          placeholder="Label name..."
                        />
                      </FormField>

                      {element.type !== 'checkbox' && (
                        <FormField style={{ margin: 0 }}>
                          <FormLabel htmlFor={`placeholder-${element.id}`}>Placeholder</FormLabel>
                          <Input
                            id={`placeholder-${element.id}`}
                            value={element.placeholder || ''}
                            onChange={(e) =>
                              handleUpdateProperty(element.id, { placeholder: e.target.value })
                            }
                            placeholder="Hint text..."
                          />
                        </FormField>
                      )}
                    </div>

                    {/* Dropdown Options Editor */}
                    {element.type === 'select' && (
                      <FormField style={{ margin: 0 }}>
                        <FormLabel htmlFor={`options-${element.id}`}>
                          Options (comma separated)
                        </FormLabel>
                        <Input
                          id={`options-${element.id}`}
                          value={(element.options || []).join(', ')}
                          onChange={(e) => {
                            const opts = e.target.value
                              .split(',')
                              .map((o) => o.trim())
                              .filter((o) => o.length > 0);
                            handleUpdateProperty(element.id, { options: opts });
                          }}
                          placeholder="Option 1, Option 2, Option 3"
                        />
                      </FormField>
                    )}

                    {/* Checkbox for Required */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <input
                        type="checkbox"
                        id={`required-${element.id}`}
                        checked={!!element.required}
                        onChange={(e) =>
                          handleUpdateProperty(element.id, { required: e.target.checked })
                        }
                        style={{ accentColor: 'var(--color-primary)' }}
                      />
                      <label
                        htmlFor={`required-${element.id}`}
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        Required field
                      </label>
                    </div>
                  </div>
                )}

                {/* Field Live Preview inside the grid */}
                <div style={{ pointerEvents: 'none', opacity: 0.9 }}>
                  <FieldElement element={element} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
