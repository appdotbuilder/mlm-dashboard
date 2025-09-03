import { db } from '../db';
import { distributorsTable, salesTable } from '../db/schema';
import { type DistributorWithStats } from '../schema';
import { eq, sum, count, sql, isNull } from 'drizzle-orm';

export async function getDistributorsWithStats(): Promise<DistributorWithStats[]> {
  try {
    // Get all distributors with their direct sales
    const distributorsWithDirectSales = await db
      .select({
        id: distributorsTable.id,
        name: distributorsTable.name,
        referrerId: distributorsTable.referrerId,
        created_at: distributorsTable.created_at,
        directSales: sql<string>`COALESCE(${sum(salesTable.amount)}, 0)`.as('direct_sales'),
      })
      .from(distributorsTable)
      .leftJoin(salesTable, eq(distributorsTable.id, salesTable.distributorId))
      .groupBy(distributorsTable.id, distributorsTable.name, distributorsTable.referrerId, distributorsTable.created_at)
      .execute();

    // Calculate downline counts and commissions for each distributor
    const results: DistributorWithStats[] = [];

    for (const distributor of distributorsWithDirectSales) {
      const directSalesAmount = parseFloat(distributor.directSales);
      
      // Get downline count using recursive CTE
      const downlineCountResult = await db.execute(sql`
        WITH RECURSIVE downline AS (
          SELECT id, name, referrer_id, 1 as level
          FROM distributors 
          WHERE referrer_id = ${distributor.id}
          
          UNION ALL
          
          SELECT d.id, d.name, d.referrer_id, dl.level + 1
          FROM distributors d
          INNER JOIN downline dl ON d.referrer_id = dl.id
        )
        SELECT COUNT(*) as downline_count FROM downline
      `);
      
      const downlineCountRow = downlineCountResult.rows?.[0] as any;
      const downlineCount = parseInt(downlineCountRow?.downline_count || '0');

      // Get total sales amount from downline using recursive CTE
      const downlineSalesResult = await db.execute(sql`
        WITH RECURSIVE downline AS (
          SELECT id, name, referrer_id, 1 as level
          FROM distributors 
          WHERE referrer_id = ${distributor.id}
          
          UNION ALL
          
          SELECT d.id, d.name, d.referrer_id, dl.level + 1
          FROM distributors d
          INNER JOIN downline dl ON d.referrer_id = dl.id
        )
        SELECT COALESCE(SUM(s.amount), 0) as downline_sales
        FROM downline dl
        LEFT JOIN sales s ON dl.id = s.distributor_id
      `);

      const downlineSalesRow = downlineSalesResult.rows?.[0] as any;
      const downlineSalesAmount = parseFloat(downlineSalesRow?.downline_sales || '0');

      // Calculate commission (10% from own sales, 5% from downline sales)
      const ownCommission = directSalesAmount * 0.10;
      const downlineCommission = downlineSalesAmount * 0.05;
      const earnedCommission = ownCommission + downlineCommission;

      results.push({
        id: distributor.id,
        name: distributor.name,
        referrerId: distributor.referrerId,
        directSales: directSalesAmount,
        earnedCommission: earnedCommission,
        downlineCount: downlineCount,
        created_at: distributor.created_at,
      });
    }

    return results;
  } catch (error) {
    console.error('Failed to get distributors with stats:', error);
    throw error;
  }
}