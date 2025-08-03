/**
 * Environment switch for API calls.
 * "VERCEL": Use the Vercel serverless function proxy. API key is handled on the server.
 * "PREVIEW": Call the Gemini API directly from the frontend. Requires API_KEY in the client environment.
 */
export const GEMINI_MODE: 'VERCEL' | 'PREVIEW' = 'VERCEL';
