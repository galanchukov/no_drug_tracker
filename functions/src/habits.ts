import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Shared logic to compute streak given startDate
const computeCurrentStreakDays = (startDate: FirebaseFirestore.Timestamp): number => {
  const now = admin.firestore.Timestamp.now();
  const diffTime = Math.abs(now.toDate().getTime() - startDate.toDate().getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

export const createHabit = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }
  
  const { title } = data;
  if (!title || typeof title !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "Missing or invalid title");
  }

  const uid = context.auth.uid;
  const db = admin.firestore();

  const newHabitRef = db.collection("habits").doc();
  const now = admin.firestore.FieldValue.serverTimestamp();

  await newHabitRef.set({
    userId: uid,
    title,
    startDate: now,
    createdAt: now,
    currentStreak: 0,
    bestStreak: 0,
    totalRelapses: 0
  });

  return { success: true, habitId: newHabitRef.id };
});

export const reportRelapse = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { habitId, reason } = data;
  if (!habitId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing habitId");
  }

  const uid = context.auth.uid;
  const db = admin.firestore();

  const habitRef = db.collection("habits").doc(habitId);

  await db.runTransaction(async (transaction) => {
    const habitDoc = await transaction.get(habitRef);
    if (!habitDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Habit not found");
    }

    const habitData = habitDoc.data();
    if (habitData?.userId !== uid) {
      throw new functions.https.HttpsError("permission-denied", "Unauthorized");
    }

    // Compute streak
    const currentStreakCount = computeCurrentStreakDays(habitData?.startDate);
    const newBestStreak = Math.max(currentStreakCount, habitData?.bestStreak || 0);

    const now = admin.firestore.FieldValue.serverTimestamp();

    // Reset startDate and add to relapse
    transaction.update(habitRef, {
      startDate: now,
      bestStreak: newBestStreak,
      currentStreak: 0,
      totalRelapses: admin.firestore.FieldValue.increment(1)
    });

    // Save relapse record
    const relapseRef = db.collection("relapses").doc();
    transaction.set(relapseRef, {
      userId: uid,
      habitId,
      date: now,
      reason: reason || ""
    });
  });

  return { success: true };
});
