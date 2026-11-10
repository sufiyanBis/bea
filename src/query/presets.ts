import type { Query } from '../criteria/types';
import { AI_ID } from '../data/taxonomies/industries';
import { SIG } from '../data/taxonomies/signals';

/** The tour's query: AI + Active + (Equity fundraising | 20% scaleup). */
export const DEMO_QUERY: Query = {
  entity: 'companies',
  countries: ['GB', 'IE'],
  combinator: 'all',
  criteria: [
    { uid: 'demo-1', defId: 'industries', op: 'any', value: [AI_ID] },
    { uid: 'demo-2', defId: 'ch-status', op: 'is', value: ['Active'] },
    { uid: 'demo-3', defId: 'signals', op: 'any', value: [SIG.equity, SIG.scale20] },
  ],
};

/** Preset from the promo card. */
export const DE_PRESET: Query = {
  entity: 'de',
  combinator: 'all',
  criteria: [{ uid: 'de-1', defId: 'industries', op: 'any', value: ['application-software', AI_ID] }],
};
