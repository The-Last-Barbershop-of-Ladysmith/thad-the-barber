import { Editor } from '@tiptap/core';
import { RichTextTool } from '../models/rich-text-tool.model';
import { RichTextToolId } from '../models/rich-text-tool-id.model';

/** The toolbar in groups: undo and redo, blocks, text styles, sub and superscript, alignment, clearing. */
export const RICH_TEXT_TOOL_GROUPS: readonly (readonly RichTextTool[])[] = [
  [
    {
      id: RichTextToolId.Undo,
      label: 'Undo',
      isAction: true,
      glyph: '↶',
    },
    {
      id: RichTextToolId.Redo,
      label: 'Redo',
      isAction: true,
      glyph: '↷',
    },
  ],
  [
    {
      id: RichTextToolId.Heading,
      label: 'H2 heading',
      glyph: 'H2',
    },
    {
      id: RichTextToolId.Subheading,
      label: 'H3 subheading',
      glyph: 'H3',
    },
    {
      id: RichTextToolId.BulletList,
      label: 'Bullet list',
      icon: 'pi-list',
    },
    {
      id: RichTextToolId.NumberedList,
      label: 'Numbered list',
      icon: 'pi-list-ol',
    },
    {
      id: RichTextToolId.Quote,
      label: 'Quote',
      glyph: '“',
    },
  ],
  [
    {
      id: RichTextToolId.Bold,
      label: 'Bold',
      icon: 'pi-bold',
    },
    {
      id: RichTextToolId.Italic,
      label: 'Italic',
      icon: 'pi-italic',
    },
    {
      id: RichTextToolId.Strikethrough,
      label: 'Strikethrough',
      glyph: 'S',
    },
    {
      id: RichTextToolId.Underline,
      label: 'Underline',
      icon: 'pi-underline',
    },
    {
      id: RichTextToolId.Highlight,
      label: 'Highlight',
      glyph: 'A',
    },
    {
      id: RichTextToolId.Link,
      label: 'Link',
      icon: 'pi-link',
    },
  ],
  [
    {
      id: RichTextToolId.Superscript,
      label: 'x² superscript',
      glyph: 'x²',
    },
    {
      id: RichTextToolId.Subscript,
      label: 'x₂ subscript',
      glyph: 'x₂',
    },
  ],
  [
    {
      id: RichTextToolId.AlignLeft,
      label: 'Align left',
      icon: 'pi-align-left',
    },
    {
      id: RichTextToolId.AlignCenter,
      label: 'Align center',
      icon: 'pi-align-center',
    },
    {
      id: RichTextToolId.AlignRight,
      label: 'Align right',
      icon: 'pi-align-right',
    },
    {
      id: RichTextToolId.AlignJustify,
      label: 'Justify',
      icon: 'pi-align-justify',
    },
  ],
  [
    {
      id: RichTextToolId.ClearFormatting,
      label: 'Clear formatting',
      isAction: true,
      icon: 'pi-eraser',
    },
  ],
];

/** The alignments written as an `align` attribute, which the site's sanitizer keeps where a style would be stripped. */
const ALIGNMENTS: readonly string[] = [
  'center',
  'right',
  'justify',
];

/** Whether the selection already has this formatting, which a toggle button shows as pressed. */
export function isToolActive(editor: Editor, id: RichTextToolId): boolean {
  switch (id) {
    case RichTextToolId.Heading:
      return editor.isActive('heading', { level: 2 });
    case RichTextToolId.Subheading:
      return editor.isActive('heading', { level: 3 });
    case RichTextToolId.Bold:
      return editor.isActive('bold');
    case RichTextToolId.Italic:
      return editor.isActive('italic');
    case RichTextToolId.Underline:
      return editor.isActive('underline');
    case RichTextToolId.Strikethrough:
      return editor.isActive('strike');
    case RichTextToolId.BulletList:
      return editor.isActive('bulletList');
    case RichTextToolId.NumberedList:
      return editor.isActive('orderedList');
    case RichTextToolId.Quote:
      return editor.isActive('blockquote');
    case RichTextToolId.Highlight:
      return editor.isActive('highlight');
    case RichTextToolId.Superscript:
      return editor.isActive('superscript');
    case RichTextToolId.Subscript:
      return editor.isActive('subscript');
    case RichTextToolId.AlignLeft:
      return !ALIGNMENTS.some((align: string): boolean => editor.isActive({ align }));
    case RichTextToolId.AlignCenter:
      return editor.isActive({ align: 'center' });
    case RichTextToolId.AlignRight:
      return editor.isActive({ align: 'right' });
    case RichTextToolId.AlignJustify:
      return editor.isActive({ align: 'justify' });
    case RichTextToolId.Link:
      return editor.isActive('link');
    default:
      return false;
  }
}

/** Whether a button that is an action, not a toggle, has anything to do now (undo with nothing to undo does not). */
export function isToolDisabled(editor: Editor, id: RichTextToolId): boolean {
  switch (id) {
    case RichTextToolId.Undo:
      return !editor.can().undo();
    case RichTextToolId.Redo:
      return !editor.can().redo();
    default:
      return false;
  }
}

function alignTo(editor: Editor, align: string | null): void {
  editor.chain().focus().updateAttributes('paragraph', { align }).updateAttributes('heading', { align }).run();
}

/** Does what the button says. The link button is the page's own, as it asks for an address first. */
export function runTool(editor: Editor, id: RichTextToolId): void {
  const chain: ReturnType<Editor['chain']> = editor.chain().focus();
  switch (id) {
    case RichTextToolId.Heading:
      chain.toggleHeading({ level: 2 }).run();
      break;
    case RichTextToolId.Subheading:
      chain.toggleHeading({ level: 3 }).run();
      break;
    case RichTextToolId.Bold:
      chain.toggleBold().run();
      break;
    case RichTextToolId.Italic:
      chain.toggleItalic().run();
      break;
    case RichTextToolId.Underline:
      chain.toggleUnderline().run();
      break;
    case RichTextToolId.Strikethrough:
      chain.toggleStrike().run();
      break;
    case RichTextToolId.BulletList:
      chain.toggleBulletList().run();
      break;
    case RichTextToolId.NumberedList:
      chain.toggleOrderedList().run();
      break;
    case RichTextToolId.Quote:
      chain.toggleBlockquote().run();
      break;
    case RichTextToolId.Highlight:
      chain.toggleHighlight().run();
      break;
    case RichTextToolId.Superscript:
      chain.toggleSuperscript().run();
      break;
    case RichTextToolId.Subscript:
      chain.toggleSubscript().run();
      break;
    case RichTextToolId.AlignLeft:
      alignTo(editor, null);
      break;
    case RichTextToolId.AlignCenter:
      alignTo(editor, 'center');
      break;
    case RichTextToolId.AlignRight:
      alignTo(editor, 'right');
      break;
    case RichTextToolId.AlignJustify:
      alignTo(editor, 'justify');
      break;
    case RichTextToolId.ClearFormatting:
      chain.clearNodes().unsetAllMarks().run();
      break;
    case RichTextToolId.Undo:
      chain.undo().run();
      break;
    case RichTextToolId.Redo:
      chain.redo().run();
      break;
    default:
      break;
  }
}
