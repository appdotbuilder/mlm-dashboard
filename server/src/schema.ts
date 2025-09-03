import { z } from 'zod';

// Distributor schema
export const distributorSchema = z.object({
  id: z.number(),
  name: z.string(),
  referrerId: z.number().nullable(), // Nullable for top-level distributors
  created_at: z.coerce.date()
});

export type Distributor = z.infer<typeof distributorSchema>;

// Input schema for creating distributors
export const createDistributorInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  referrerId: z.number().nullable() // Can be null for top-level distributors
});

export type CreateDistributorInput = z.infer<typeof createDistributorInputSchema>;

// Sale schema
export const saleSchema = z.object({
  id: z.number(),
  distributorId: z.number(),
  productName: z.string(),
  quantity: z.number().int().positive(),
  amount: z.number().positive(), // Stored as numeric in DB, but we use number in TS
  date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Sale = z.infer<typeof saleSchema>;

// Input schema for creating sales
export const createSaleInputSchema = z.object({
  distributorId: z.number(),
  productName: z.string().min(1, "Product name is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
  amount: z.number().positive("Amount must be positive"),
  date: z.coerce.date()
});

export type CreateSaleInput = z.infer<typeof createSaleInputSchema>;

// Commission schema (calculated field)
export const commissionSchema = z.object({
  distributorId: z.number(),
  distributorName: z.string(),
  ownSales: z.number(), // Total sales made by the distributor
  ownCommission: z.number(), // Commission from own sales
  downlineCommission: z.number(), // Commission from downline sales
  totalCommission: z.number() // Total commission earned
});

export type Commission = z.infer<typeof commissionSchema>;

// Dashboard stats schema
export const dashboardStatsSchema = z.object({
  totalSales: z.number(),
  totalCommissionsPaid: z.number(),
  totalDistributors: z.number(),
  totalSalesAmount: z.number()
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// Distributor with sales and commission info
export const distributorWithStatsSchema = z.object({
  id: z.number(),
  name: z.string(),
  referrerId: z.number().nullable(),
  directSales: z.number(), // Total amount of direct sales
  earnedCommission: z.number(), // Total commission earned
  downlineCount: z.number(), // Number of people in their downline
  created_at: z.coerce.date()
});

export type DistributorWithStats = z.infer<typeof distributorWithStatsSchema>;

// Downline hierarchy schema (recursive)
export const downlineHierarchySchema: z.ZodType<{
  distributor: Distributor;
  children?: DownlineHierarchy[];
}> = z.object({
  distributor: distributorSchema,
  children: z.array(z.lazy(() => downlineHierarchySchema)).optional()
});

export type DownlineHierarchy = z.infer<typeof downlineHierarchySchema>;