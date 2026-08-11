/**
 * Vercel Express entry — pure ESM (.mjs) so Node does not require() the API build.
 */
import express from "express";
import apiApp from "./apps/api/dist/vercel-handler.js";

void express;

export default apiApp;
