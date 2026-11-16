import { primitive } from '../app/theme/tokens/primitive';
import { semantic } from '../app/theme/tokens/semantic';

export interface Rgba {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

const COLOR_MIX: RegExp = /^color-mix\(in srgb,\s*(.+?)\s+(\d+(?:\.\d+)?)%,\s*(.+)\)$/u;
const TOKEN_REFERENCE: RegExp = /^\{(.+)\}$/u;
const TRANSPARENT: Rgba = {
  red: 0,
  green: 0,
  blue: 0,
  alpha: 0,
};
const BLACK: Rgba = {
  red: 0,
  green: 0,
  blue: 0,
  alpha: 1,
};

export function resolveColor(value: string): Rgba {
  const trimmed: string = value.trim();
  const reference: RegExpExecArray | null = TOKEN_REFERENCE.exec(trimmed);
  if (reference?.[1]) {
    return resolveColor(lookupToken(reference[1]));
  }
  const mix: RegExpExecArray | null = COLOR_MIX.exec(trimmed);
  if (mix?.[1] && mix[2] && mix[3]) {
    return mixColors(
      resolveColor(mix[1]),
      Number(mix[2]) / 100,
      resolveColor(mix[3]),
    );
  }
  if (trimmed === 'transparent') {
    return TRANSPARENT;
  }
  return parseHex(trimmed);
}

export function compositeOver(foreground: Rgba, background: Rgba): Rgba {
  const alpha: number = foreground.alpha + background.alpha * (1 - foreground.alpha);
  const mixChannel: (front: number, back: number) => number = (front: number, back: number): number =>
    (front * foreground.alpha + back * background.alpha * (1 - foreground.alpha)) / alpha;
  return {
    red: mixChannel(foreground.red, background.red),
    green: mixChannel(foreground.green, background.green),
    blue: mixChannel(foreground.blue, background.blue),
    alpha,
  };
}

export function contrastRatio(foreground: Rgba, background: Rgba): number {
  const solidBackground: Rgba = compositeOver(background, BLACK);
  const solidForeground: Rgba = compositeOver(foreground, solidBackground);
  const lighter: number = Math.max(relativeLuminance(solidForeground), relativeLuminance(solidBackground));
  const darker: number = Math.min(relativeLuminance(solidForeground), relativeLuminance(solidBackground));
  return (lighter + 0.05) / (darker + 0.05);
}

function mixColors(
  first: Rgba,
  firstShare: number,
  second: Rgba,
): Rgba {
  const firstWeight: number = firstShare * first.alpha;
  const secondWeight: number = (1 - firstShare) * second.alpha;
  const alpha: number = firstWeight + secondWeight;
  if (alpha === 0) {
    return TRANSPARENT;
  }
  return {
    red: (first.red * firstWeight + second.red * secondWeight) / alpha,
    green: (first.green * firstWeight + second.green * secondWeight) / alpha,
    blue: (first.blue * firstWeight + second.blue * secondWeight) / alpha,
    alpha,
  };
}

function lookupToken(path: string): string {
  const segments: string[] = path.split('.');
  const found: unknown = [
    primitive,
    semantic,
    (semantic as Record<string, unknown>)['extend'],
  ]
    .map((root: unknown): unknown => walk(root, segments))
    .find((candidate: unknown): boolean => typeof candidate === 'string');
  if (typeof found !== 'string') {
    throw new Error(`Unknown token {${path}}`);
  }
  return found;
}

function walk(node: unknown, segments: string[]): unknown {
  if (segments.length === 0) {
    return node;
  }
  if (typeof node !== 'object' || node === null) {
    return undefined;
  }
  const record: Record<string, unknown> = node as Record<string, unknown>;
  for (let taken: number = 1; taken <= segments.length; taken++) {
    const key: string = segments
      .slice(0, taken)
      .map((segment: string, index: number): string => {
        if (index === 0) {
          return segment;
        }
        return segment.charAt(0).toUpperCase() + segment.slice(1);
      })
      .join('');
    const result: unknown = walk(record[key], segments.slice(taken));
    if (result !== undefined) {
      return result;
    }
  }
  return undefined;
}

function parseHex(hex: string): Rgba {
  const digits: string = hex.replace('#', '');
  return {
    red: parseInt(digits.slice(0, 2), 16),
    green: parseInt(digits.slice(2, 4), 16),
    blue: parseInt(digits.slice(4, 6), 16),
    alpha: 1,
  };
}

function relativeLuminance(color: Rgba): number {
  const toLinear: (channel: number) => number = (channel: number): number => {
    const share: number = channel / 255;
    if (share <= 0.04045) {
      return share / 12.92;
    }
    return ((share + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(color.red) + 0.7152 * toLinear(color.green) + 0.0722 * toLinear(color.blue);
}
