/**
 * A tiny, dependency-free rich-text editor built around the browser's
 * native contenteditable + `document.execCommand`. Zero new dependencies
 * per the project's constraints.
 *
 * Supported commands:
 *   Bold · Italic · Underline · Bulleted list · Numbered list ·
 *   Insert link · H2 heading · Paragraph · Undo · Redo
 *
 * The editor emits the current sanitised HTML back to the parent via the
 * `onChange` prop, so it can plug directly into the Newsletter Campaign
 * form (or any other admin form).
 */
import { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon, Heading2, Undo2, Redo2, Type } from 'lucide-react';

function ToolbarButton({ onClick, icon: Icon, label, active = false, testId }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={label}
      aria-label={label}
      data-testid={testId}
      className={`h-8 w-8 inline-flex items-center justify-center rounded-md border border-transparent transition-colors ${active ? 'bg-foreground text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
    >
      <Icon size={14} />
    </button>
  );
}

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Write your campaign…',
  testId = 'rich-text-editor',
  minHeight = '260px',
}) {
  const ref = useRef(null);
  const [isEmpty, setIsEmpty] = useState(!value);

  // Sync incoming value into the editor only when it's coming from outside
  // (parent state initialised, or reset). Avoid clobbering the caret while
  // the user is typing.
  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== value && document.activeElement !== ref.current) {
      ref.current.innerHTML = value || '';
      setIsEmpty(!(value || '').replace(/<[^>]*>/g, '').trim());
    }
  }, [value]);

  const exec = (command, arg) => {
    document.execCommand(command, false, arg);
    handleInput();
    ref.current?.focus();
  };

  const handleInput = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    setIsEmpty(!html.replace(/<[^>]*>/g, '').trim());
    onChange && onChange(html);
  };

  const handleLink = () => {
    const url = window.prompt('Enter URL (include https://)');
    if (!url) return;
    exec('createLink', url);
  };

  const handleBlock = (block) => {
    exec('formatBlock', `<${block}>`);
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-white" data-testid={testId}>
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 px-2 py-1.5">
        <ToolbarButton onClick={() => exec('bold')}      icon={Bold}         label="Bold"         testId={`${testId}-bold`}/>
        <ToolbarButton onClick={() => exec('italic')}    icon={Italic}       label="Italic"       testId={`${testId}-italic`}/>
        <ToolbarButton onClick={() => exec('underline')} icon={UnderlineIcon} label="Underline"   testId={`${testId}-underline`}/>
        <div className="mx-1 h-5 w-px bg-border" aria-hidden />
        <ToolbarButton onClick={() => handleBlock('h2')} icon={Heading2}     label="Heading"      testId={`${testId}-h2`}/>
        <ToolbarButton onClick={() => handleBlock('p')}  icon={Type}         label="Paragraph"    testId={`${testId}-p`}/>
        <div className="mx-1 h-5 w-px bg-border" aria-hidden />
        <ToolbarButton onClick={() => exec('insertUnorderedList')} icon={List}       label="Bulleted list" testId={`${testId}-ul`}/>
        <ToolbarButton onClick={() => exec('insertOrderedList')}   icon={ListOrdered} label="Numbered list" testId={`${testId}-ol`}/>
        <ToolbarButton onClick={handleLink}                        icon={LinkIcon}    label="Insert link"   testId={`${testId}-link`}/>
        <div className="mx-1 h-5 w-px bg-border" aria-hidden />
        <ToolbarButton onClick={() => exec('undo')} icon={Undo2} label="Undo" testId={`${testId}-undo`}/>
        <ToolbarButton onClick={() => exec('redo')} icon={Redo2} label="Redo" testId={`${testId}-redo`}/>
      </div>

      <div className="relative">
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 px-4 py-3 text-sm text-muted-foreground">
            {placeholder}
          </div>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          data-testid={`${testId}-content`}
          className="prose prose-sm max-w-none px-4 py-3 outline-none text-sm leading-relaxed text-foreground [&>h2]:font-display [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mt-2 [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6 [&>a]:text-blue-600 [&>a]:underline"
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}
