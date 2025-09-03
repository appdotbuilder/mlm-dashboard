import { db } from '../db';
import { distributorsTable, salesTable } from '../db/schema';
import { type Commission } from '../schema';
import { eq, sum, sql, inArray } from 'drizzle-orm';

// Commission rates
const OWN_COMMISSION_RATE = 0.10; // 10% commission on own sales
const DOWNLINE_COMMISSION_RATE = 0.02; // 2% commission on downline sales

export async function getCommissions(): Promise<Commission[]> {
  try {
    // Get all distributors
    const distributors = await db.select()
      .from(distributorsTable)
      .execute();

    const commissions: Commission[] = [];

    for (const distributor of distributors) {
      // Calculate own sales total
      const ownSalesResult = await db.select({
        total: sum(salesTable.amount)
      })
      .from(salesTable)
      .where(eq(salesTable.distributorId, distributor.id))
      .execute();

      const ownSales = parseFloat(ownSalesResult[0]?.total || '0');

      // Get all downline distributors (recursive)
      const downlineIds = await getDownlineIds(distributor.id);

      // Calculate downline sales total
      let downlineSales = 0;
      if (downlineIds.length > 0) {
        const downlineSalesResult = await db.select({
          total: sum(salesTable.amount)
        })
        .from(salesTable)
        .where(inArray(salesTable.distributorId, downlineIds))
        .execute();

        downlineSales = parseFloat(downlineSalesResult[0]?.total || '0');
      }

      // Calculate commissions
      const ownCommission = ownSales * OWN_COMMISSION_RATE;
      const downlineCommission = downlineSales * DOWNLINE_COMMISSION_RATE;
      const totalCommission = ownCommission + downlineCommission;

      commissions.push({
        distributorId: distributor.id,
        distributorName: distributor.name,
        ownSales,
        ownCommission,
        downlineCommission,
        totalCommission
      });
    }

    return commissions;
  } catch (error) {
    console.error('Commission calculation failed:', error);
    throw error;
  }
}

// Helper function to recursively get all downline distributor IDs
async function getDownlineIds(distributorId: number): Promise<number[]> {
  const downlineIds: number[] = [];

  // Get direct referrals
  const directReferrals = await db.select()
    .from(distributorsTable)
    .where(eq(distributorsTable.referrerId, distributorId))
    .execute();

  for (const referral of directReferrals) {
    downlineIds.push(referral.id);
    
    // Recursively get their downlines
    const subDownlineIds = await getDownlineIds(referral.id);
    downlineIds.push(...subDownlineIds);
  }

  return downlineIds;
}