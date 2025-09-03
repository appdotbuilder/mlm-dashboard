import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createDistributorInputSchema, 
  createSaleInputSchema 
} from './schema';

// Import handlers
import { createDistributor } from './handlers/create_distributor';
import { getDistributors } from './handlers/get_distributors';
import { getDistributorsWithStats } from './handlers/get_distributors_with_stats';
import { getDownlineHierarchy } from './handlers/get_downline_hierarchy';
import { createSale } from './handlers/create_sale';
import { getSales } from './handlers/get_sales';
import { getCommissions } from './handlers/get_commissions';
import { getDashboardStats } from './handlers/get_dashboard_stats';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Dashboard
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),

  // Distributor management
  createDistributor: publicProcedure
    .input(createDistributorInputSchema)
    .mutation(({ input }) => createDistributor(input)),
  
  getDistributors: publicProcedure
    .query(() => getDistributors()),
  
  getDistributorsWithStats: publicProcedure
    .query(() => getDistributorsWithStats()),
  
  getDownlineHierarchy: publicProcedure
    .input(z.object({ distributorId: z.number() }))
    .query(({ input }) => getDownlineHierarchy(input.distributorId)),

  // Sales management
  createSale: publicProcedure
    .input(createSaleInputSchema)
    .mutation(({ input }) => createSale(input)),
  
  getSales: publicProcedure
    .query(() => getSales()),

  // Commission management
  getCommissions: publicProcedure
    .query(() => getCommissions()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`MLM Dashboard TRPC server listening at port: ${port}`);
}

start();