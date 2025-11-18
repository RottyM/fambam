import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {google} from "googleapis";

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// For cost control
setGlobalOptions({maxInstances: 10});

/**
 * Approve a chore and award points to the user
 * This ensures atomic update of both chore status and user points
 */
export const approveChoreAndAwardPoints = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {familyId, choreId} = request.data;

  if (!familyId || !choreId) {
    throw new HttpsError(
      "invalid-argument",
      "familyId and choreId are required"
    );
  }

  try {
    // Get the chore document
    const choreRef = db
      .collection("families")
      .doc(familyId)
      .collection("chores")
      .doc(choreId);

    const choreDoc = await choreRef.get();

    if (!choreDoc.exists) {
      throw new HttpsError("not-found", "Chore not found");
    }

    const choreData = choreDoc.data();

    if (!choreData) {
      throw new HttpsError("not-found", "Chore data not found");
    }

    // Check if chore is in submitted status
    if (choreData.status !== "submitted") {
      throw new HttpsError(
        "failed-precondition",
        "Chore must be in submitted status to approve"
      );
    }

    const userId = choreData.assignedTo;
    const pointValue = choreData.pointValue || 0;

    // Use a transaction to ensure atomic updates
    await db.runTransaction(async (transaction) => {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found");
      }

      const currentPoints = userDoc.data()?.points || 0;

      // Update chore status
      transaction.update(choreRef, {
        status: "approved",
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        approvedBy: request.auth?.uid || null,
      });

      // Award points to user
      transaction.update(userRef, {
        points: currentPoints + pointValue,
      });
    });

    logger.info(
      `Chore ${choreId} approved and ${pointValue} points awarded to ${userId}`
    );

    return {
      success: true,
      pointsAwarded: pointValue,
      message: `Chore approved and ${pointValue} points awarded!`,
    };
  } catch (error) {
    logger.error("Error approving chore:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to approve chore");
  }
});

/**
 * Assign a random avatar to a user
 * Returns a random avatar configuration
 */
export const assignRandomAvatar = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const avatarStyles = [
    "adventurer",
    "avataaars",
    "big-smile",
    "bottts",
    "fun-emoji",
    "pixel-art",
  ];

  const randomStyle =
    avatarStyles[Math.floor(Math.random() * avatarStyles.length)];
  const seed = request.auth.uid;

  const avatar = {
    type: "dicebear",
    style: randomStyle,
    seed: seed,
    url: `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${seed}`,
  };

  logger.info(`Random avatar assigned to user ${request.auth.uid}:`, avatar);

  return {avatar};
});

/**
 * Fetch a daily meme from an API and store it in Firestore
 * Runs daily at midnight UTC
 */
export const fetchDailyMeme = onSchedule(
  {
    schedule: "0 0 * * *", // Run at midnight UTC every day
    timeZone: "UTC",
  },
  async () => {
    try {
      logger.info("Fetching daily meme...");

      // Use meme-api.com which is a proxy for Reddit memes
      const response = await fetch("https://meme-api.com/gimme/memes");

      if (!response.ok) {
        throw new Error(`Meme API error: ${response.statusText}`);
      }

      const memeData = await response.json();

      // Verify it's SFW
      if (memeData.nsfw) {
        logger.warn("Got NSFW meme, fetching another...");
        const retryResponse = await fetch("https://meme-api.com/gimme/memes");
        const retryData = await retryResponse.json();
        if (!retryData.nsfw) {
          Object.assign(memeData, retryData);
        } else {
          throw new Error("No SFW memes found");
        }
      }

      // Store in Firestore
      await db.collection("app-config").doc("daily-meme").set({
        title: memeData.title,
        url: memeData.url,
        author: memeData.author,
        upvotes: memeData.ups,
        fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
        date: new Date().toISOString().split("T")[0],
      });

      logger.info("Daily meme updated successfully:", memeData.title);
    } catch (error) {
      logger.error("Error fetching daily meme:", error);
      throw error;
    }
  }
);

/**
 * Manual trigger for fetching daily meme (for testing)
 */
export const fetchDailyMemeManual = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    logger.info("Manually fetching daily meme...");

    // Use meme-api.com which is a proxy for Reddit memes
    // This avoids being blocked by Reddit
    const response = await fetch("https://meme-api.com/gimme/memes");

    logger.info("Meme API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Meme API error response:", errorText);
      throw new Error(`Meme API error: ${response.statusText}`);
    }

    const memeData = await response.json();
    logger.info("Meme data received:", memeData.title);

    // Verify it's SFW
    if (memeData.nsfw) {
      // Try one more time if we got NSFW
      logger.warn("Got NSFW meme, fetching another...");
      const retryResponse = await fetch("https://meme-api.com/gimme/memes");
      const retryData = await retryResponse.json();
      if (retryData.nsfw) {
        throw new HttpsError("not-found", "No SFW memes found");
      }
      Object.assign(memeData, retryData);
    }

    await db.collection("app-config").doc("daily-meme").set({
      title: memeData.title,
      url: memeData.url,
      author: memeData.author,
      upvotes: memeData.ups,
      fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
      date: new Date().toISOString().split("T")[0],
    });

    logger.info("Daily meme updated successfully:", memeData.title);

    return {
      success: true,
      meme: {
        title: memeData.title,
        url: memeData.url,
      },
    };
  } catch (error) {
    logger.error("Error fetching daily meme:", error);
    throw new HttpsError("internal", "Failed to fetch daily meme");
  }
});

/**
 * Create a Google Calendar for a family
 * Called when family is first created
 */
export const createFamilyCalendar = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {familyId, familyName} = request.data;

  if (!familyId || !familyName) {
    throw new HttpsError(
      "invalid-argument",
      "familyId and familyName are required"
    );
  }

  try {
    logger.info(`Creating Google Calendar for family: ${familyId}`);

    // Initialize Google Calendar API with service account
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendar = google.calendar({version: "v3", auth});

    // Create a new calendar
    const calendarResponse = await calendar.calendars.insert({
      requestBody: {
        summary: `${familyName} Calendar`,
        description: `Shared family calendar for ${familyName}`,
        timeZone: "America/New_York",
      },
    });

    const calendarId = calendarResponse.data.id;
    logger.info(`Calendar created with ID: ${calendarId}`);

    // Make the calendar public (readable by family members)
    await calendar.acl.insert({
      calendarId: calendarId as string,
      requestBody: {
        role: "reader",
        scope: {
          type: "default",
        },
      },
    });

    // Store calendar ID in family document
    await db.collection("families").doc(familyId).update({
      googleCalendarId: calendarId,
      calendarCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("Family calendar created successfully");

    return {
      success: true,
      calendarId: calendarId,
    };
  } catch (error) {
    logger.error("Error creating family calendar:", error);
    throw new HttpsError("internal", "Failed to create family calendar");
  }
});

/**
 * Sync a Firestore event to Google Calendar
 */
export const syncEventToGoogleCalendar = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {familyId, eventId, eventData} = request.data;

  if (!familyId || !eventId || !eventData) {
    throw new HttpsError(
      "invalid-argument",
      "familyId, eventId, and eventData are required"
    );
  }

  try {
    // Get family's Google Calendar ID
    const familyDoc = await db.collection("families").doc(familyId).get();
    const familyData = familyDoc.data();

    if (!familyData?.googleCalendarId) {
      throw new HttpsError(
        "failed-precondition",
        "Family calendar not set up"
      );
    }

    const calendarId = familyData.googleCalendarId;

    // Initialize Google Calendar API
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendar = google.calendar({version: "v3", auth});

    // Format event for Google Calendar
    const googleEvent = {
      summary: eventData.title,
      description: eventData.description || "",
      start: {
        dateTime: eventData.start,
        timeZone: "America/New_York",
      },
      end: {
        dateTime: eventData.end,
        timeZone: "America/New_York",
      },
    };

    // Check if event already exists in Google Calendar
    if (eventData.googleEventId) {
      // Update existing event
      await calendar.events.update({
        calendarId: calendarId,
        eventId: eventData.googleEventId,
        requestBody: googleEvent,
      });

      logger.info(`Updated event in Google Calendar: ${eventData.title}`);
    } else {
      // Create new event
      const response = await calendar.events.insert({
        calendarId: calendarId,
        requestBody: googleEvent,
      });

      // Store Google event ID in Firestore
      await db
        .collection("families")
        .doc(familyId)
        .collection("calendar-events")
        .doc(eventId)
        .update({
          googleEventId: response.data.id,
        });

      logger.info(`Created event in Google Calendar: ${eventData.title}`);
    }

    return {success: true};
  } catch (error) {
    logger.error("Error syncing event to Google Calendar:", error);
    throw new HttpsError("internal", "Failed to sync event");
  }
});

/**
 * Delete an event from Google Calendar
 */
export const deleteEventFromGoogleCalendar = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {familyId, googleEventId} = request.data;

  if (!familyId || !googleEventId) {
    throw new HttpsError(
      "invalid-argument",
      "familyId and googleEventId are required"
    );
  }

  try {
    // Get family's Google Calendar ID
    const familyDoc = await db.collection("families").doc(familyId).get();
    const familyData = familyDoc.data();

    if (!familyData?.googleCalendarId) {
      throw new HttpsError(
        "failed-precondition",
        "Family calendar not set up"
      );
    }

    const calendarId = familyData.googleCalendarId;

    // Initialize Google Calendar API
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendar = google.calendar({version: "v3", auth});

    // Delete event from Google Calendar
    await calendar.events.delete({
      calendarId: calendarId,
      eventId: googleEventId,
    });

    logger.info(`Deleted event from Google Calendar: ${googleEventId}`);

    return {success: true};
  } catch (error) {
    logger.error("Error deleting event from Google Calendar:", error);
    throw new HttpsError("internal", "Failed to delete event");
  }
});
