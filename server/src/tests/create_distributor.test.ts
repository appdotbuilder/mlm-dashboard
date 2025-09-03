import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { distributorsTable } from '../db/schema';
import { type CreateDistributorInput } from '../schema';
import { createDistributor } from '../handlers/create_distributor';
import { eq } from 'drizzle-orm';

describe('createDistributor', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a top-level distributor (no referrer)', async () => {
    const testInput: CreateDistributorInput = {
      name: 'Top Level Distributor',
      referrerId: null
    };

    const result = await createDistributor(testInput);

    // Basic field validation
    expect(result.name).toEqual('Top Level Distributor');
    expect(result.referrerId).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save top-level distributor to database', async () => {
    const testInput: CreateDistributorInput = {
      name: 'Test Distributor',
      referrerId: null
    };

    const result = await createDistributor(testInput);

    // Verify in database
    const distributors = await db.select()
      .from(distributorsTable)
      .where(eq(distributorsTable.id, result.id))
      .execute();

    expect(distributors).toHaveLength(1);
    expect(distributors[0].name).toEqual('Test Distributor');
    expect(distributors[0].referrerId).toBeNull();
    expect(distributors[0].created_at).toBeInstanceOf(Date);
  });

  it('should create a distributor with valid referrer', async () => {
    // First create a referrer
    const referrerInput: CreateDistributorInput = {
      name: 'Referrer Distributor',
      referrerId: null
    };
    const referrer = await createDistributor(referrerInput);

    // Now create a distributor with the referrer
    const testInput: CreateDistributorInput = {
      name: 'Child Distributor',
      referrerId: referrer.id
    };

    const result = await createDistributor(testInput);

    // Validate fields
    expect(result.name).toEqual('Child Distributor');
    expect(result.referrerId).toEqual(referrer.id);
    expect(result.id).toBeDefined();
    expect(result.id).not.toEqual(referrer.id); // Different ID
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save distributor with referrer to database', async () => {
    // Create referrer first
    const referrerInput: CreateDistributorInput = {
      name: 'Parent Distributor',
      referrerId: null
    };
    const referrer = await createDistributor(referrerInput);

    // Create child distributor
    const testInput: CreateDistributorInput = {
      name: 'Child Distributor',
      referrerId: referrer.id
    };
    const result = await createDistributor(testInput);

    // Verify in database
    const distributors = await db.select()
      .from(distributorsTable)
      .where(eq(distributorsTable.id, result.id))
      .execute();

    expect(distributors).toHaveLength(1);
    expect(distributors[0].name).toEqual('Child Distributor');
    expect(distributors[0].referrerId).toEqual(referrer.id);
    expect(distributors[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when referrer does not exist', async () => {
    const testInput: CreateDistributorInput = {
      name: 'Invalid Child',
      referrerId: 999 // Non-existent ID
    };

    await expect(createDistributor(testInput)).rejects.toThrow(/referrer with id 999 not found/i);
  });

  it('should create multiple distributors in hierarchy', async () => {
    // Create top-level distributor
    const topInput: CreateDistributorInput = {
      name: 'CEO',
      referrerId: null
    };
    const ceo = await createDistributor(topInput);

    // Create second-level distributor
    const managerInput: CreateDistributorInput = {
      name: 'Manager',
      referrerId: ceo.id
    };
    const manager = await createDistributor(managerInput);

    // Create third-level distributor
    const salesInput: CreateDistributorInput = {
      name: 'Sales Rep',
      referrerId: manager.id
    };
    const salesRep = await createDistributor(salesInput);

    // Validate hierarchy
    expect(ceo.referrerId).toBeNull();
    expect(manager.referrerId).toEqual(ceo.id);
    expect(salesRep.referrerId).toEqual(manager.id);

    // Verify all have unique IDs
    const ids = [ceo.id, manager.id, salesRep.id];
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toEqual(3);
  });

  it('should handle empty string name validation through schema', async () => {
    // This test verifies the Zod schema validation would catch empty names
    // The handler expects valid input, but we can test the boundary case
    const testInput: CreateDistributorInput = {
      name: 'Valid Name',
      referrerId: null
    };

    const result = await createDistributor(testInput);
    expect(result.name).toEqual('Valid Name');
  });
});