# Project TODO

- [x] Establish Msaada visual system: warm cream canvas, terracotta/ochre/sage palette, organic translucent forms, bold sans typography, delicate uppercase labels, and responsive mobile-first layout.
- [x] Build public landing page with NEED → HELP → IMPACT story, featured fictional Kenyan demo needs, impact statistics, trust explanation, and primary calls to action.
- [x] Build public discovery experience with keyword search, category/location/urgency/need-type/verification/fulfillment filters, sorting, loading, empty, and error states.
- [x] Define relational schema for profiles, categories, needs, contributions, updates, verification records, impact records, reports, notifications, and file references.
- [x] Add fictional Kenyan community demo data with clear demo labels and no fabricated real organizations, reviews, or testimonials.
- [x] Implement public need detail pages with high-signal need information, transparent progress, contribution options, updates, reporting, verification explanation, narration controls, impact timeline, and outcome summary.
- [x] Implement multi-step create-need flow with draft saving, AI analysis, editable structured fields, missing-information prompts, review preview, and submit-for-review workflow.
- [x] Add server-side AI request analysis and public-summary generation with explicit AI-assisted labels and no verification claims.
- [x] Add optional supporting image/document attachment flow that stores only file references related to needs.
- [x] Implement pledge contributions for money, items, skills, time, logistics, and professional services without real payment processing.
- [x] Implement accessible approved-summary narration with play/pause/stop, loading/error states, caching, and graceful no-audio fallback.
- [x] Implement server-authorized authentication, profiles, USER/MODERATOR/ADMIN role handling, protected moderation workflows, and moderation history.
- [x] Build participant dashboard with active needs, fulfilled needs, contributions, activity, notifications, and empty/error/loading states.
- [x] Build admin dashboard with overview, needs, pending reviews, reports, users, categories, impact, and moderation actions.
- [x] Implement verification, report categories, notifications, lifecycle transitions, contribution status transitions, and secure validation/authorization.
- [x] Add Vitest coverage for key server workflows and run typecheck/tests.
- [x] Verify responsive UI content and routes in the running preview; mobile screenshot capture remains environment-limited.
- [x] Save the final project checkpoint and deliver the project version.
- [x] Add focused Vitest coverage for optional integration fallbacks, metadata-only file references, lifecycle rules, and role boundaries.
- [x] Verify the discovery, need detail, create-need, dashboard, and admin routes at desktop and mobile viewports with captured visual evidence.
- [x] Connect optional ElevenLabs narration and file-reference adapters with graceful fallback behavior; credentials/storage URLs remain optional.

# Scope change: database and Vercel preparation

- [x] Replace demo-only need, contribution, report, dashboard, and moderation reads with relational database-backed procedures and UI states.
- [x] Remove AI mockup copy, fake AI result presentation, and mock AI interactions from the product experience; retain only clearly optional server integration boundaries if requested.
- [x] Add database seed/migration verification and tests for persisted needs, contributions, reports, and moderation workflows.
- [x] Prepare Vercel-compatible build and deployment configuration, including environment-variable documentation and server/runtime compatibility review.
- [ ] Validate the updated application and save a new checkpoint before handing over Vercel deployment steps.
