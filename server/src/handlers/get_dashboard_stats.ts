import { db } from '../db';
import { distributorsTable, salesTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { count, sum, eq } from 'drizzle-orm';

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get total number of sales records
    const totalSalesResult = await db.select({ 
      count: count() 
    })
      .from(salesTable)
      .execute();

    // Get total sales amount (sum of all sale amounts)
    const totalSalesAmountResult = await db.select({ 
      total: sum(salesTable.amount) 
    })
      .from(salesTable)
      .execute();

    // Get total number of distributors
    const totalDistributorsResult = await db.select({ 
      count: count() 
    })
      .from(distributorsTable)
      .execute();

    // Calculate commissions using multiple queries for clarity
    // Get all distributors for commission calculation
    const allDistributors = await db.select()
      .from(distributorsTable)
      .execute();

    let totalCommissionsPaid = 0;

    // Calculate commissions for each distributor
    for (const distributor of allDistributors) {
      // Get distributor's own sales (10% commission)
      const ownSalesResult = await db.select({ 
        total: sum(salesTable.amount) 
      })
        .from(salesTable)
        .where(eq(salesTable.distributorId, distributor.id))
        .execute();

      const ownSalesAmount = ownSalesResult[0]?.total 
        ? parseFloat(ownSalesResult[0].total) 
        : 0;
      
      const ownCommission = ownSalesAmount * 0.10;

      // Get direct downline sales (5% commission)
      const directDownline = await db.select()
        .from(distributorsTable)
        .where(eq(distributorsTable.referrerId, distributor.id))
        .execute();

      let downlineCommission = 0;
      for (const downlineDistributor of directDownline) {
        const downlineSalesResult = await db.select({ 
          total: sum(salesTable.amount) 
        })
          .from(salesTable)
          .where(eq(salesTable.distributorId, downlineDistributor.id))
          .execute();

        const downlineSalesAmount = downlineSalesResult[0]?.total 
          ? parseFloat(downlineSalesResult[0].total) 
          : 0;

        downlineCommission += downlineSalesAmount * 0.05;
      }

      totalCommissionsPaid += ownCommission + downlineCommission;
    }

    // Extract values and handle nulls/undefined
    const totalSales = totalSalesResult[0]?.count || 0;
    const totalSalesAmount = totalSalesAmountResult[0]?.total 
      ? parseFloat(totalSalesAmountResult[0].total) 
      : 0;
    const totalDistributors = totalDistributorsResult[0]?.count || 0;

    return {
      totalSales,
      totalCommissionsPaid,
      totalDistributors,
      totalSalesAmount
    };
  } catch (error) {
    console.error('Dashboard stats calculation failed:', error);
    throw error;
  }
}