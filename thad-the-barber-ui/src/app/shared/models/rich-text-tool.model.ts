import { RichTextToolId } from './rich-text-tool-id.model';

/** How a toolbar button looks and what it is called for screen readers. Either an icon or a glyph of text. */
export interface RichTextTool {
  id: RichTextToolId;
  label: string;
  icon?: string;
  glyph?: string;
  /** It does something once, as undo does, rather than switching a style on and off, so it is never shown pressed. */
  isAction?: boolean;
  /** The icon is drawn mirrored, so one undo icon serves for redo too. */
  isMirrored?: boolean;
}
