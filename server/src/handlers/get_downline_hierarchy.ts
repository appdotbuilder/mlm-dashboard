import { db } from '../db';
import { distributorsTable } from '../db/schema';
import { type DownlineHierarchy, type Distributor } from '../schema';
import { eq } from 'drizzle-orm';

export async function getDownlineHierarchy(distributorId: number): Promise<DownlineHierarchy | null> {
  try {
    // First, get the root distributor
    const distributorResults = await db.select()
      .from(distributorsTable)
      .where(eq(distributorsTable.id, distributorId))
      .execute();

    if (distributorResults.length === 0) {
      return null;
    }

    const rootDistributor: Distributor = distributorResults[0];

    // Recursively build the hierarchy
    const hierarchy = await buildHierarchy(rootDistributor);
    return hierarchy;
  } catch (error) {
    console.error('Failed to get downline hierarchy:', error);
    throw error;
  }
}

async function buildHierarchy(distributor: Distributor): Promise<DownlineHierarchy> {
  // Get all direct referrals for this distributor
  const directReferrals = await db.select()
    .from(distributorsTable)
    .where(eq(distributorsTable.referrerId, distributor.id))
    .execute();

  // If no direct referrals, return just the distributor
  if (directReferrals.length === 0) {
    return {
      distributor,
      children: []
    };
  }

  // Recursively build hierarchy for each direct referral
  const children: DownlineHierarchy[] = [];
  for (const referral of directReferrals) {
    const childHierarchy = await buildHierarchy(referral);
    children.push(childHierarchy);
  }

  return {
    distributor,
    children
  };
}