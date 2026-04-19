import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { validateTelegramInitData } from "./utils";

/**
 * Endpoint for Telegram authentication
 * Validates initData and returns custom Firebase auth token.
 */
export const authWithTelegram = functions.https.onCall(async (data, context) => {
  const initData = data.initData;
  if (!initData) {
    throw new functions.https.HttpsError("invalid-argument", "Missing initData");
  }

  // Fallback bot token, usually should be securely stored in Firebase Secrets/Env
  const BOT_TOKEN = process.env.BOT_TOKEN || "BOT_TOKEN_HERE";

  const validatedData = validateTelegramInitData(initData, BOT_TOKEN);
  if (!validatedData) {
    throw new functions.https.HttpsError("unauthenticated", "Invalid Telegram initData");
  }

  const userJson = validatedData.user;
  if (!userJson) {
    throw new functions.https.HttpsError("unauthenticated", "User data not found in initData");
  }

  const tgUser = JSON.parse(userJson);
  const uid = String(tgUser.id);

  // Sync user in database
  const userRef = admin.firestore().collection("users").doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    await userRef.set({
      uid: uid,
      username: tgUser.username || tgUser.first_name || "Unknown",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      achievements: []
    });
  }

  // Create Firebase Custom Token
  const customToken = await admin.auth().createCustomToken(uid);
  return { customToken, uid };
});
