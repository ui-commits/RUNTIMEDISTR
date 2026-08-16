export const PROJECTION_MODES = [
  'geographic',
  'digital',
  'physical',
  'ontology',
  'knowledge',
] as const;

export type ProjectionMode = (typeof PROJECTION_MODES)[number];
export type DigitalLayoutMode = 'radial' | 'grid';

export function isProjectionMode(value: unknown): value is ProjectionMode {
  return typeof value === 'string' && (PROJECTION_MODES as readonly string[]).includes(value);
}