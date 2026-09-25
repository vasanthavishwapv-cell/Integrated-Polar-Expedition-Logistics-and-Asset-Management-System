import { PERMISSIONS } from '../middleware/auth';

describe('RBAC Permissions Matrix', () => {
  it('gives admin full access across all modules', () => {
    const modules = Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[];
    for (const mod of modules) {
      expect(PERMISSIONS[mod]['admin']).toBe('full');
    }
  });

  it('restricts user management solely to admin', () => {
    expect(PERMISSIONS.users['admin']).toBe('full');
    expect(PERMISSIONS.users['expedition_coordinator']).toBeUndefined();
    expect(PERMISSIONS.users['logistics_officer']).toBeUndefined();
    expect(PERMISSIONS.users['inventory_manager']).toBeUndefined();
    expect(PERMISSIONS.users['station_ops']).toBeUndefined();
  });

  it('gives logistics officer full access to cargo and read access to inventory/expeditions', () => {
    expect(PERMISSIONS.cargo['logistics_officer']).toBe('full');
    expect(PERMISSIONS.inventory['logistics_officer']).toBe('read');
    expect(PERMISSIONS.expeditions['logistics_officer']).toBe('read');
  });

  it('gives inventory manager full access to inventory and read access to cargo', () => {
    expect(PERMISSIONS.inventory['inventory_manager']).toBe('full');
    expect(PERMISSIONS.cargo['inventory_manager']).toBe('read');
  });

  it('gives emergency coordinator full access to incidents and read access to other operational modules', () => {
    expect(PERMISSIONS.incidents['emergency_coordinator']).toBe('full');
    expect(PERMISSIONS.expeditions['emergency_coordinator']).toBe('read');
    expect(PERMISSIONS.inventory['emergency_coordinator']).toBe('read');
  });
});
