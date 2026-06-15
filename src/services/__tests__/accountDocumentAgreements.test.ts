import { buildDriverDocAgreements } from '../accountDocumentAgreements';

describe('buildDriverDocAgreements', () => {
  it('emits driver doc + raw agreements with grantor as source', () => {
    const grantor = '0x1111111111111111111111111111111111111111' as const;
    const out = buildDriverDocAgreements(grantor);
    const types = out.map((a) => a.eventType);
    expect(types).toEqual(['dimo.document.driver.*', 'dimo.raw.driver.*']);
    expect(out.every((a) => a.source === grantor)).toBe(true);
    expect(out.every((a) => Array.isArray(a.ids) && a.ids.length === 0)).toBe(true);
    expect(out.every((a) => a.tags.includes('documents'))).toBe(true);
  });
});
