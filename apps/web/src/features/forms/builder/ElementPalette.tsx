import React, { useState } from 'react';
import { FormElementType, FieldDataType } from '@saas/shared';
import { Card, CardHeader, CardContent, Badge } from '../../../components';

export interface PaletteItem {
  type: FormElementType;
  title: string;
  icon: string;
  description: string;
  category: 'interactive' | 'display';
  dataType?: FieldDataType;
}

export const PALETTE_ITEMS: PaletteItem[] = [
  // Interactive Fields
  {
    type: 'text',
    title: 'Text Input',
    icon: 'text_fields',
    description: 'Single-line text field',
    category: 'interactive',
    dataType: 'text',
  },
  {
    type: 'email',
    title: 'Email Field',
    icon: 'alternate_email',
    description: 'Email address with validation',
    category: 'interactive',
    dataType: 'text',
  },
  {
    type: 'number',
    title: 'Number',
    icon: 'tag',
    description: 'Numeric input',
    category: 'interactive',
    dataType: 'number',
  },
  {
    type: 'phone',
    title: 'Phone Number',
    icon: 'call',
    description: 'Telephone input',
    category: 'interactive',
    dataType: 'number',
  },
  {
    type: 'date',
    title: 'Date Picker',
    icon: 'calendar_today',
    description: 'Calendar date selection',
    category: 'interactive',
    dataType: 'date',
  },
  {
    type: 'textarea',
    title: 'Text Area',
    icon: 'notes',
    description: 'Multi-line comments or notes',
    category: 'interactive',
    dataType: 'text',
  },
  {
    type: 'select',
    title: 'Dropdown',
    icon: 'arrow_drop_down_circle',
    description: 'Pick an option from dropdown',
    category: 'interactive',
    dataType: 'text',
  },
  {
    type: 'radio',
    title: 'Radio Group',
    icon: 'radio_button_checked',
    description: 'Single selection from list',
    category: 'interactive',
    dataType: 'text',
  },
  {
    type: 'checkbox',
    title: 'Checkbox',
    icon: 'check_box',
    description: 'Boolean consent or toggle',
    category: 'interactive',
    dataType: 'boolean',
  },
  {
    type: 'file',
    title: 'File Upload',
    icon: 'attach_file',
    description: 'Document or image upload',
    category: 'interactive',
    dataType: 'file',
  },
  {
    type: 'button',
    title: 'Button',
    icon: 'smart_button',
    description: 'Submit or action button',
    category: 'interactive',
  },

  // Non-Interactive / Display Elements
  {
    type: 'title',
    title: 'Heading',
    icon: 'title',
    description: 'Large or medium title heading',
    category: 'display',
  },
  {
    type: 'description',
    title: 'Description',
    icon: 'article',
    description: 'Instructive paragraph or note',
    category: 'display',
  },
  {
    type: 'divider',
    title: 'Divider',
    icon: 'horizontal_rule',
    description: 'Clean visual horizontal separator',
    category: 'display',
  },
  {
    type: 'alert',
    title: 'Notice Card',
    icon: 'info',
    description: 'Callout info, warning, or tip',
    category: 'display',
  },
  {
    type: 'spacer',
    title: 'Spacer',
    icon: 'height',
    description: 'Vertical layout spacing',
    category: 'display',
  },
];

export interface ElementPaletteProps {
  onAddElement: (type: FormElementType) => void;
}

export const ElementPalette: React.FC<ElementPaletteProps> = ({ onAddElement }) => {
  const [filter, setFilter] = useState<'all' | 'interactive' | 'display'>('all');

  const handleDragStart = (e: React.DragEvent, type: FormElementType) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ action: 'create', type }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const filteredItems = PALETTE_ITEMS.filter(
    (item) => filter === 'all' || item.category === filter,
  );

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(100vh - 140px)' }}>
      <CardHeader
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
              Elements Palette
            </span>
            <Badge variant="neutral" size="small">
              {PALETTE_ITEMS.length}
            </Badge>
          </div>
        }
      />
      <div style={{ padding: '0 var(--space-3) var(--space-2) var(--space-3)' }}>
        {/* Category Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--color-bg-primary)',
            padding: '3px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            gap: '2px',
          }}
        >
          <button
            type="button"
            onClick={() => setFilter('all')}
            style={{
              flex: 1,
              padding: '4px 6px',
              border: 'none',
              background: filter === 'all' ? 'var(--color-primary)' : 'transparent',
              color: filter === 'all' ? '#fff' : 'var(--color-text-secondary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontWeight: 'var(--font-weight-medium)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('interactive')}
            style={{
              flex: 1,
              padding: '4px 6px',
              border: 'none',
              background: filter === 'interactive' ? 'var(--color-primary)' : 'transparent',
              color: filter === 'interactive' ? '#fff' : 'var(--color-text-secondary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontWeight: 'var(--font-weight-medium)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            Fields
          </button>
          <button
            type="button"
            onClick={() => setFilter('display')}
            style={{
              flex: 1,
              padding: '4px 6px',
              border: 'none',
              background: filter === 'display' ? 'var(--color-primary)' : 'transparent',
              color: filter === 'display' ? '#fff' : 'var(--color-text-secondary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontWeight: 'var(--font-weight-medium)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            Content
          </button>
        </div>
      </div>

      <CardContent style={{ padding: '0 var(--space-3) var(--space-3) var(--space-3)', flex: 1, overflowY: 'auto' }}>
        <p
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
            margin: '0 0 var(--space-2) 0',
          }}
        >
          Drag an item into any zone, or click to insert into selected zone.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {filteredItems.map((item) => (
            <div
              key={item.type}
              id={`palette-item-${item.type}`}
              draggable
              onDragStart={(e) => handleDragStart(e, item.type)}
              onClick={() => onAddElement(item.type)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-2) var(--space-3)',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'grab',
                transition: 'all var(--transition-fast)',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.transform = 'none';
              }}
              title={`Drag or click to add ${item.title}`}
            >
              <span className="material-icon" style={{ fontSize: '20px', color: 'var(--color-primary)' }}>
                {item.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {item.title}
                  </span>
                  {item.dataType && (
                    <span
                      style={{
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        padding: '1px 4px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        color: 'var(--color-primary)',
                        fontWeight: 'var(--font-weight-semibold)',
                      }}
                    >
                      {item.dataType}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.description}
                </div>
              </div>
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-muted)',
                }}
              >
                +
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
