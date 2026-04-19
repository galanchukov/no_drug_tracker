import * as admin from "firebase-admin";

// Initialize Firebase Admin app
admin.initializeApp();

// Export all functions
export * from "./auth";
export * from "./habits";
