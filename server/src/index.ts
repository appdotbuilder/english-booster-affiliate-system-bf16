import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  loginInputSchema,
  createProgramInputSchema,
  updateProgramInputSchema,
  createRegistrationInputSchema,
  trackLinkClickInputSchema,
  createPayoutRequestInputSchema,
  updatePayoutStatusInputSchema,
  verifyPaymentInputSchema
} from './schema';

// Import handlers
import { registerUser, loginUser } from './handlers/auth';
import { createProgram, updateProgram, deleteProgram, getPrograms, getProgramById } from './handlers/programs';
import { createRegistration, verifyPayment, getAllRegistrations, getRegistrationsByAffiliate } from './handlers/registrations';
import { trackLinkClick, getAffiliateStats, getLinkClicksByAffiliate } from './handlers/tracking';
import { createPayoutRequest, updatePayoutStatus, getPayoutRequestsByAffiliate, getAllPayoutRequests } from './handlers/payouts';
import { getAffiliateByCode, getAllAffiliates, generateUniqueAffiliateCode } from './handlers/affiliate';
import { calculateCommission, getCommissionRateByProgramType } from './handlers/commission';
import { seedPrograms, createAdminUser } from './handlers/seed';

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

  // Authentication routes
  register: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Program management routes (Admin)
  createProgram: publicProcedure
    .input(createProgramInputSchema)
    .mutation(({ input }) => createProgram(input)),

  updateProgram: publicProcedure
    .input(updateProgramInputSchema)
    .mutation(({ input }) => updateProgram(input)),

  deleteProgram: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteProgram(input.id)),

  getPrograms: publicProcedure
    .query(() => getPrograms()),

  getProgramById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getProgramById(input.id)),

  // Registration routes
  createRegistration: publicProcedure
    .input(createRegistrationInputSchema)
    .mutation(({ input }) => createRegistration(input)),

  verifyPayment: publicProcedure
    .input(verifyPaymentInputSchema)
    .mutation(({ input }) => verifyPayment(input)),

  getAllRegistrations: publicProcedure
    .query(() => getAllRegistrations()),

  getRegistrationsByAffiliate: publicProcedure
    .input(z.object({ affiliateId: z.number() }))
    .query(({ input }) => getRegistrationsByAffiliate(input.affiliateId)),

  // Tracking routes
  trackLinkClick: publicProcedure
    .input(trackLinkClickInputSchema)
    .mutation(({ input }) => trackLinkClick(input)),

  getAffiliateStats: publicProcedure
    .input(z.object({ affiliateId: z.number() }))
    .query(({ input }) => getAffiliateStats(input.affiliateId)),

  getLinkClicksByAffiliate: publicProcedure
    .input(z.object({ affiliateId: z.number() }))
    .query(({ input }) => getLinkClicksByAffiliate(input.affiliateId)),

  // Payout routes
  createPayoutRequest: publicProcedure
    .input(z.object({
      affiliateId: z.number(),
      payoutData: createPayoutRequestInputSchema
    }))
    .mutation(({ input }) => createPayoutRequest(input.affiliateId, input.payoutData)),

  updatePayoutStatus: publicProcedure
    .input(updatePayoutStatusInputSchema)
    .mutation(({ input }) => updatePayoutStatus(input)),

  getPayoutRequestsByAffiliate: publicProcedure
    .input(z.object({ affiliateId: z.number() }))
    .query(({ input }) => getPayoutRequestsByAffiliate(input.affiliateId)),

  getAllPayoutRequests: publicProcedure
    .query(() => getAllPayoutRequests()),

  // Affiliate management routes
  getAffiliateByCode: publicProcedure
    .input(z.object({ affiliateCode: z.string() }))
    .query(({ input }) => getAffiliateByCode(input.affiliateCode)),

  getAllAffiliates: publicProcedure
    .query(() => getAllAffiliates()),

  generateUniqueAffiliateCode: publicProcedure
    .query(() => generateUniqueAffiliateCode()),

  // Commission calculation routes
  getCommissionRateByProgramType: publicProcedure
    .input(z.object({ programType: z.string() }))
    .query(({ input }) => getCommissionRateByProgramType(input.programType)),

  // Setup/Seed routes (Admin only - should be protected in real implementation)
  seedPrograms: publicProcedure
    .mutation(() => seedPrograms()),

  createAdminUser: publicProcedure
    .mutation(() => createAdminUser()),
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
  console.log(`English Booster Affiliate System TRPC server listening at port: ${port}`);
}

start();