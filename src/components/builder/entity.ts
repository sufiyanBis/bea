import type { Entity } from '../../data/types';

export const ENTITY_LABELS: Record<Entity, { select: string; button: string; add: string; plural: string }> = {
  companies: { select: 'companies', button: 'Search for companies', add: 'Add company criteria', plural: 'companies' },
  de: { select: 'German legal entities', button: 'Search for German legal entities', add: 'Add German legal entity criteria', plural: 'German legal entities' },
  funds: { select: 'funds', button: 'Search for funds', add: 'Add fund criteria', plural: 'funds' },
  people: { select: 'people', button: 'Search for people', add: 'Add people criteria', plural: 'people' },
};
