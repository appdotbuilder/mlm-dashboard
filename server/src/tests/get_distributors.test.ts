import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { distributorsTable } from '../db/schema';
import { type CreateDistributorInput } from '../schema';
import { getDistributors } from '../handlers/get_distributors';

// Test inputs for creating distributors
const topLevelDistributor: CreateDistributorInput = {
  name: 'Top Level Distributor',
  referrerId: null
};

const downlineDistributor: CreateDistributorInput = {
  name: 'Downline Distributor',
  referrerId: 1 // Will reference the first distributor
};

describe('getDistributors', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no distributors exist', async () => {
    const result = await getDistributors();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all distributors', async () => {
    // Create test distributors
    const topLevel = await db.insert(distributorsTable)
      .values({
        name: topLevelDistributor.name,
        referrerId: topLevelDistributor.referrerId
      })
      .returning()
      .execute();

    const downline = await db.insert(distributorsTable)
      .values({
        name: downlineDistributor.name,
        referrerId: topLevel[0].id
      })
      .returning()
      .execute();

    const result = await getDistributors();

    expect(result).toHaveLength(2);
    expect(result.every(d => typeof d.id === 'number')).toBe(true);
    expect(result.every(d => typeof d.name === 'string')).toBe(true);
    expect(result.every(d => d.created_at instanceof Date)).toBe(true);
  });

  it('should return distributors with correct field types', async () => {
    // Create a distributor with null referrerId
    await db.insert(distributorsTable)
      .values({
        name: 'Test Distributor',
        referrerId: null
      })
      .returning()
      .execute();

    const result = await getDistributors();

    expect(result).toHaveLength(1);
    const distributor = result[0];
    
    expect(typeof distributor.id).toBe('number');
    expect(typeof distributor.name).toBe('string');
    expect(distributor.referrerId).toBeNull();
    expect(distributor.created_at).toBeInstanceOf(Date);
    expect(distributor.name).toBe('Test Distributor');
  });

  it('should handle distributors with referrer relationships', async () => {
    // Create parent distributor first
    const parent = await db.insert(distributorsTable)
      .values({
        name: 'Parent Distributor',
        referrerId: null
      })
      .returning()
      .execute();

    // Create child distributor
    await db.insert(distributorsTable)
      .values({
        name: 'Child Distributor',
        referrerId: parent[0].id
      })
      .returning()
      .execute();

    const result = await getDistributors();

    expect(result).toHaveLength(2);
    
    // Find parent and child in results
    const parentResult = result.find(d => d.name === 'Parent Distributor');
    const childResult = result.find(d => d.name === 'Child Distributor');

    expect(parentResult).toBeDefined();
    expect(childResult).toBeDefined();
    expect(parentResult!.referrerId).toBeNull();
    expect(childResult!.referrerId).toBe(parent[0].id);
  });

  it('should return distributors ordered by creation date (newest first)', async () => {
    // Create distributors with slight delay to ensure different timestamps
    const first = await db.insert(distributorsTable)
      .values({
        name: 'First Distributor',
        referrerId: null
      })
      .returning()
      .execute();

    // Small delay to ensure different created_at times
    await new Promise(resolve => setTimeout(resolve, 10));

    const second = await db.insert(distributorsTable)
      .values({
        name: 'Second Distributor',
        referrerId: null
      })
      .returning()
      .execute();

    const result = await getDistributors();

    expect(result).toHaveLength(2);
    
    // Should be ordered by created_at descending (newest first)
    expect(result[0].name).toBe('Second Distributor');
    expect(result[1].name).toBe('First Distributor');
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should handle multiple levels of hierarchy correctly', async () => {
    // Create a 3-level hierarchy: grandparent -> parent -> child
    const grandparent = await db.insert(distributorsTable)
      .values({
        name: 'Grandparent',
        referrerId: null
      })
      .returning()
      .execute();

    const parent = await db.insert(distributorsTable)
      .values({
        name: 'Parent',
        referrerId: grandparent[0].id
      })
      .returning()
      .execute();

    await db.insert(distributorsTable)
      .values({
        name: 'Child',
        referrerId: parent[0].id
      })
      .returning()
      .execute();

    const result = await getDistributors();

    expect(result).toHaveLength(3);
    
    // Verify the hierarchy relationships are preserved
    const grandparentResult = result.find(d => d.name === 'Grandparent');
    const parentResult = result.find(d => d.name === 'Parent');
    const childResult = result.find(d => d.name === 'Child');

    expect(grandparentResult!.referrerId).toBeNull();
    expect(parentResult!.referrerId).toBe(grandparent[0].id);
    expect(childResult!.referrerId).toBe(parent[0].id);
  });
});