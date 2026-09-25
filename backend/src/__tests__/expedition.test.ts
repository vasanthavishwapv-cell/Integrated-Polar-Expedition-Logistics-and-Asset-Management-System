import { isValidExpeditionTransition, ExpeditionStatus } from '../models/Expedition';

describe('Expedition State Machine Transitions', () => {
  it('allows valid progression from draft to planned', () => {
    expect(isValidExpeditionTransition('draft', 'planned')).toBe(true);
  });

  it('allows valid progression from planned to active', () => {
    expect(isValidExpeditionTransition('planned', 'active')).toBe(true);
  });

  it('allows valid progression from active to completed', () => {
    expect(isValidExpeditionTransition('active', 'completed')).toBe(true);
  });

  it('allows cancellation from draft and planned only', () => {
    expect(isValidExpeditionTransition('draft', 'cancelled')).toBe(true);
    expect(isValidExpeditionTransition('planned', 'cancelled')).toBe(true);
    expect(isValidExpeditionTransition('active', 'cancelled')).toBe(false);
  });

  it('rejects jumping backwards or invalid steps', () => {
    expect(isValidExpeditionTransition('completed', 'active')).toBe(false);
    expect(isValidExpeditionTransition('draft', 'completed')).toBe(false);
    expect(isValidExpeditionTransition('completed', 'draft')).toBe(false);
    expect(isValidExpeditionTransition('cancelled', 'active')).toBe(false);
  });
});
