/**
 * Vercel Node serverless entry (apps/api/api/index.ts).
 * Built Express app is exported from dist/vercel-handler.js after buildCommand.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — resolved after vercel buildCommand compiles dist/
export { default } from "../dist/vercel-handler.js";
