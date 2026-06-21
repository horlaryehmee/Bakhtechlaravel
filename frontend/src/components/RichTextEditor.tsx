import { useRef, useEffect, useState } from 'react'
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter text...',
  className = '',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [sourceMode, setSourceMode] = useState(false)
  const isEmpty = !value || value === '<br>'

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value && !isEditing) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value, isEditing, sourceMode])

  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleInput()
  }

  const setEditorMode = (source: boolean) => {
    setIsEditing(false)
    setSourceMode(source)
  }

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleBlur = () => {
    setIsEditing(false)
  }

  const handleFocus = () => {
    setIsEditing(true)
  }

  return (
    <div className={`wp-classic-editor ${className}`}>
      <div className="wp-editor-tabs" role="tablist" aria-label="Editor mode">
        <button
          type="button"
          role="tab"
          aria-selected={!sourceMode}
          className={!sourceMode ? 'is-active' : ''}
          onClick={() => setEditorMode(false)}
        >
          Visual
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={sourceMode}
          className={sourceMode ? 'is-active' : ''}
          onClick={() => setEditorMode(true)}
        >
          Text
        </button>
      </div>

      {!sourceMode ? <div className="wp-editor-toolbar">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg hover:bg-[var(--surface-3)]"
          onMouseDown={(event) => { event.preventDefault(); executeCommand('bold') }}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg hover:bg-[var(--surface-3)]"
          onMouseDown={(event) => { event.preventDefault(); executeCommand('italic') }}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg hover:bg-[var(--surface-3)]"
          onMouseDown={(event) => { event.preventDefault(); executeCommand('underline') }}
          title="Underline (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </Button>

        <div className="w-px bg-[var(--line)] mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg hover:bg-[var(--surface-3)]"
          onMouseDown={(event) => { event.preventDefault(); executeCommand('insertUnorderedList') }}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg hover:bg-[var(--surface-3)]"
          onMouseDown={(event) => { event.preventDefault(); executeCommand('insertOrderedList') }}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="w-px bg-[var(--line)] mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg hover:bg-[var(--surface-3)]"
          onMouseDown={(event) => { event.preventDefault(); executeCommand('justifyLeft') }}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg hover:bg-[var(--surface-3)]"
          onMouseDown={(event) => { event.preventDefault(); executeCommand('justifyCenter') }}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg hover:bg-[var(--surface-3)]"
          onMouseDown={(event) => { event.preventDefault(); executeCommand('justifyRight') }}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

      </div> : null}

      {/* Editor */}
      <div className="relative">
        {isEmpty ? (
          <span
            aria-hidden="true"
            className="text-soft pointer-events-none absolute left-4 top-3"
          >
            {placeholder}
          </span>
        ) : null}
        {sourceMode ? (
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label={`${placeholder} HTML source`}
            className="wp-editor-source min-h-40 w-full resize-y px-4 py-3 font-mono text-sm outline-none"
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label={placeholder}
            aria-multiline="true"
            onInput={handleInput}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="rich-text-editor-content min-h-40 px-4 py-3 outline-none"
            style={{
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
            }}
          />
        )}
      </div>
    </div>
  )
}
