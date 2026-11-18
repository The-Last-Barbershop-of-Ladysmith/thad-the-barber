import { Extension, GlobalAttributes } from '@tiptap/core';

/**
 * Paragraph and heading alignment, kept as the old HTML `align` attribute instead of a style. The site cleans every
 * announcement with a sanitizer that drops `style`, so a style would be lost the moment it was saved.
 */
export const TextAlign: Extension = Extension.create({
  name: 'textAlign',
  addGlobalAttributes(): GlobalAttributes {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          align: {
            default: null,
            parseHTML: (element: HTMLElement): string | null => element.getAttribute('align'),
            renderHTML: (attributes: Record<string, unknown>): Record<string, string> =>
              typeof attributes['align'] === 'string' ? { align: attributes['align'] } : {},
          },
        },
      },
    ];
  },
});
