import { Editor } from '@tiptap/core';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import StarterKit from '@tiptap/starter-kit';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  Signal,
  signal,
  viewChild,
  ViewEncapsulation,
  WritableSignal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RichTextTool } from '../../models/rich-text-tool.model';
import { RichTextToolId } from '../../models/rich-text-tool-id.model';
import { isAllowedLink } from '../../utils/link-allowed.utils';
import { TextAlign } from './text-align.extension';
import { RICH_TEXT_TOOL_GROUPS, isToolActive, isToolDisabled, runTool } from '../../utils/rich-text-tools.utils';

/**
 * A small editor for the formatting an announcement can carry: bold, italic, a bullet list and links. It holds and
 * reports HTML, and the API cleans that HTML again before it is stored.
 */
@Component({
  selector: 'app-rich-text-editor',
  imports: [
    ButtonModule,
    InputTextModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './rich-text-editor.html',
  styleUrl: './rich-text-editor.scss',
})
export class RichTextEditor {
  /** The id of the element that names this field. */
  readonly labelledBy: InputSignal<string> = input.required<string>();
  readonly html: InputSignal<string> = input<string>('');
  readonly htmlChange: OutputEmitterRef<string> = output<string>();

  protected readonly toolGroups: readonly (readonly RichTextTool[])[] = RICH_TEXT_TOOL_GROUPS;
  protected readonly activeTools: WritableSignal<ReadonlySet<RichTextToolId>> =
    signal<ReadonlySet<RichTextToolId>>(new Set());
  protected readonly disabledTools: WritableSignal<ReadonlySet<RichTextToolId>> =
    signal<ReadonlySet<RichTextToolId>>(new Set());
  protected readonly isEditingLink: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly linkUrl: WritableSignal<string> = signal<string>('');
  protected readonly linkProblem: WritableSignal<string | null> = signal<string | null>(null);

  private readonly surface: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('surface');
  private readonly linkInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('linkInput');
  private readonly editor: WritableSignal<Editor | null> = signal<Editor | null>(null);

  constructor() {
    const destroyRef: DestroyRef = inject(DestroyRef);
    afterNextRender((): void => {
      const element: HTMLElement | undefined = this.surface()?.nativeElement;
      if (element === undefined) {
        return;
      }
      const editor: Editor = new Editor({
        element,
        // The editor's own stylesheet would be a <style> tag, which the page's CSP blocks; the SCSS styles it instead.
        injectCSS: false,
        content: this.html(),
        extensions: [
          StarterKit.configure({
            heading: { levels: [2, 3] },
            code: false,
            codeBlock: false,
            horizontalRule: false,
            // It would add an empty paragraph after every list, which would be saved with the message.
            trailingNode: false,
            link: {
              openOnClick: false,
              autolink: false,
              // A link is a plain link: a site page opens in place, and the API cleans the rest.
              HTMLAttributes: {
                target: null,
                rel: null,
              },
              isAllowedUri: isAllowedLink,
            },
          }),
          Highlight,
          Superscript,
          Subscript,
          TextAlign,
        ],
        editorProps: {
          attributes: {
            role: 'textbox',
            'aria-multiline': 'true',
            'aria-labelledby': this.labelledBy(),
            class: 'editor-text',
          },
        },
        onUpdate: (): void => {
          this.htmlChange.emit(this.readHtml(editor));
        },
        onTransaction: (): void => {
          const tools: RichTextToolId[] = Object.values(RichTextToolId);
          this.activeTools.set(new Set(tools.filter((id: RichTextToolId): boolean => isToolActive(editor, id))));
          this.disabledTools.set(new Set(tools.filter((id: RichTextToolId): boolean => isToolDisabled(editor, id))));
        },
      });
      this.editor.set(editor);
      destroyRef.onDestroy((): void => {
        editor.destroy();
      });
    });
    effect((): void => {
      const html: string = this.html();
      const editor: Editor | null = this.editor();
      if (editor !== null && html !== this.readHtml(editor)) {
        editor.commands.setContent(html, { emitUpdate: false });
      }
    });
    effect((): void => {
      if (this.isEditingLink()) {
        this.linkInput()?.nativeElement.focus();
      }
    });
  }

  protected isLinkOn(): boolean {
    return this.activeTools().has(RichTextToolId.Link);
  }

  protected useTool(id: RichTextToolId): void {
    const editor: Editor | null = this.editor();
    if (id === RichTextToolId.Link) {
      this.openLink();
    } else if (editor !== null) {
      runTool(editor, id);
    }
  }

  protected openLink(): void {
    const editor: Editor | null = this.editor();
    if (editor === null) {
      return;
    }
    const hasSelection: boolean = !editor.state.selection.empty;
    if (!hasSelection && !editor.isActive('link')) {
      this.linkProblem.set('Select the words you want to link first.');
      return;
    }
    this.linkProblem.set(null);
    this.linkUrl.set((editor.getAttributes('link')['href'] as string | undefined) ?? '');
    this.isEditingLink.set(true);
  }

  protected onLinkInput(event: Event): void {
    this.linkUrl.set((event.target as HTMLInputElement).value);
  }

  protected applyLink(): void {
    const url: string = this.linkUrl().trim();
    if (!isAllowedLink(url)) {
      this.linkProblem.set('Use a page on this site starting with /, an https link, tel: or mailto:.');
      return;
    }
    this.editor()?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    this.closeLink();
  }

  protected removeLink(): void {
    this.editor()?.chain().focus().extendMarkRange('link').unsetLink().run();
    this.closeLink();
  }

  protected closeLink(): void {
    this.isEditingLink.set(false);
    this.linkProblem.set(null);
    this.editor()?.commands.focus();
  }

  private readHtml(editor: Editor): string {
    return editor.isEmpty ? '' : editor.getHTML();
  }
}
