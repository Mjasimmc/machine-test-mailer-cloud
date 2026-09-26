import React, { useState } from 'react';
import { FormElementType } from '@saas/shared';
import { FloatingPanel } from './FloatingPanel';
import './FloatingElementsPanel.scss';

export interface FloatingElementsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAddElement: (type: FormElementType) => void;
}

interface ElementDefinition {
  type: FormElementType;
  title: string;
  icon: string;
  description: string;
  category: 'interactive' | 'display';
}

const ELEMENT_DEFINITIONS: ElementDefinition[] = [
  // Interactive Elements
  {
    type: 'text',
    title: 'Text Field',
    icon: 'text_fields',
    description: 'Single-line text input',
    category: 'interactive',
  },
  {
    type: 'email',
    title: 'Email Address',
    icon: 'alternate_email',
    description: 'Email with validation',
    category: 'interactive',
  },
  {
    type: 'number',
    title: 'Number',
    icon: 'tag',
    description: 'Numeric values & counts',
    category: 'interactive',
  },
  {
    type: 'phone',
    title: 'Phone Number',
    icon: 'call',
    description: 'Telephone input',
    category: 'interactive',
  },
  {
    type: 'date',
    title: 'Date Picker',
    icon: 'calendar_today',
    description: 'Calendar date selection',
    category: 'interactive',
  },
  {
    type: 'textarea',
    title: 'Long Text',
    icon: 'notes',
    description: 'Multi-line comments or notes',
    category: 'interactive',
  },
  {
    type: 'select',
    title: 'Dropdown',
    icon: 'arrow_drop_down_circle',
    description: 'Single selection menu',
    category: 'interactive',
  },
  {
    type: 'radio',
    title: 'Radio Group',
    icon: 'radio_button_checked',
    description: 'Select one from option list',
    category: 'interactive',
  },
  {
    type: 'checkbox',
    title: 'Checkbox',
    icon: 'check_box',
    description: 'Boolean consent or toggle',
    category: 'interactive',
  },
  {
    type: 'file',
    title: 'File Upload',
    icon: 'upload_file',
    description: 'Attachments and documents',
    category: 'interactive',
  },
  {
    type: 'button',
    title: 'Action Button',
    icon: 'smart_button',
    description: 'Submit response or action',
    category: 'interactive',
  },
  // Non-Interactive Elements
  {
    type: 'title',
    title: 'Heading',
    icon: 'title',
    description: 'Section headline or title',
    category: 'display',
  },
  {
    type: 'description',
    title: 'Paragraph',
    icon: 'description',
    description: 'Instructive text or notice',
    category: 'display',
  },
  {
    type: 'alert',
    title: 'Notice Banner',
    icon: 'announcement',
    description: 'Highlighted callout note',
    category: 'display',
  },
  {
    type: 'divider',
    title: 'Divider',
    icon: 'horizontal_rule',
    description: 'Visual separation line',
    category: 'display',
  },
  {
    type: 'spacer',
    title: 'Spacer',
    icon: 'space_bar',
    description: 'Adjustable vertical space',
    category: 'display',
  },
];

export const FloatingElementsPanel: React.FC<FloatingElementsPanelProps> = ({
  isOpen,
  onClose,
  onAddElement,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'interactive' | 'display'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleDragStart = (e: React.DragEvent, item: ElementDefinition) => {
    e.dataTransfer.effectAllowed = 'copy';
    const payload = JSON.stringify({
      kind: 'palette_element',
      source: 'palette',
      action: 'create',
      type: item.type,
    });
    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.setData('text/plain', item.type);
  };

  const filteredItems = ELEMENT_DEFINITIONS.filter((item) => {
    const matchesTab = filterTab === 'all' || item.category === filterTab;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <FloatingPanel
      title="Add Elements"
      icon="widgets"
      isOpen={isOpen}
      onClose={onClose}
      width={360}
      defaultPosition={{ x: 28, y: window.innerHeight - 560 }}
    >
      <div className="elements-panel-content">
        <p className="elements-panel-subtitle">
          Drag an element directly into any Zone on the canvas, or click to append.
        </p>

        {/* Search & Category Filter */}
        <div className="elements-panel-search">
          <span className="material-icon">search</span>
          <input
            type="text"
            placeholder="Search elements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="elements-panel-clear-search"
              onClick={() => setSearchQuery('')}
            >
              <span className="material-icon">clear</span>
            </button>
          )}
        </div>

        <div className="elements-panel-tabs">
          <button
            type="button"
            className={filterTab === 'all' ? 'active' : ''}
            onClick={() => setFilterTab('all')}
          >
            All ({ELEMENT_DEFINITIONS.length})
          </button>
          <button
            type="button"
            className={filterTab === 'interactive' ? 'active' : ''}
            onClick={() => setFilterTab('interactive')}
          >
            Interactive (11)
          </button>
          <button
            type="button"
            className={filterTab === 'display' ? 'active' : ''}
            onClick={() => setFilterTab('display')}
          >
            Display (5)
          </button>
        </div>

        {/* Elements Grid */}
        <div className="elements-grid">
          {filteredItems.map((item) => (
            <div
              key={item.type}
              className={`element-palette-card element-palette-card--${item.category}`}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onClick={() => onAddElement(item.type)}
              title={`Drag to zone or click to add: ${item.title}`}
            >
              <div className="element-palette-card__icon-wrap">
                <span className="material-icon">{item.icon}</span>
              </div>
              <div className="element-palette-card__info">
                <span className="element-palette-card__title">{item.title}</span>
                <span className="element-palette-card__desc">{item.description}</span>
              </div>
              <span className="material-icon element-palette-card__drag-hint">drag_indicator</span>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="elements-grid-empty">
              <span className="material-icon">search_off</span>
              <p>No elements found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    </FloatingPanel>
  );
};
