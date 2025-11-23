import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2"; 
import {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {google} from "googleapis";
// LAST_UPDATED_FOR_TMDB_KEY_FIX: 2025-11-22 (Final Lowercase Fix)
// FORCING DEPLOYMENT DUE TO CONFIG ERROR: 2025-11-22 (Final Attempt)

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// For cost control
setGlobalOptions({maxInstances: 10}); 

/**
 * Sync user profile changes to Auth Custom Claims
 */
export const syncUserClaims = onDocumentWritten("users/{userId}", async (event) => {
  const userId = event.params.userId;

  // 1. Handle User Deletion
  if (!event.data?.after.exists) {
    try {
      await admin.auth().setCustomUserClaims(userId, null);
      logger.info(`Claims cleared for deleted user ${userId}`);
    } catch (error) {
      logger.error("Error clearing claims:", error);
    }
    return;
  }

  const newData = event.data.after.data();
  const previousData = event.data.before.data();

  // Optimization: Only run if familyId or role actually changed
  if (
    previousData &&
    newData?.familyId === previousData.familyId &&
    newData?.role === previousData.role
  ) {
    return;
  }

  const customClaims = {
    familyId: newData?.familyId || null,
    role: newData?.role || null,
  };

  try {
    await admin.auth().setCustomUserClaims(userId, customClaims);
    logger.info(`Claims updated for user ${userId}:`, customClaims);

    // Write timestamp back to Firestore to signal frontend that claims are ready
    await event.data.after.ref.set(
      { claimsUpdatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
  } catch (error) {
    logger.error("Error setting custom claims:", error);
  }
});

/**
 * Approve a chore and award points to the user
 */
export const approveChoreAndAwardPoints = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {familyId, choreId} = request.data;

  if (!familyId || !choreId) {
    throw new HttpsError("invalid-argument", "familyId and choreId are required");
  }

  try {
    const choreRef = db.collection("families").doc(familyId).collection("chores").doc(choreId);
    const choreDoc = await choreRef.get();

    if (!choreDoc.exists) {
      throw new HttpsError("not-found", "Chore not found");
    }

    const choreData = choreDoc.data();
    if (!choreData) throw new HttpsError("not-found", "Chore data not found");

    if (choreData.status !== "submitted") {
      throw new HttpsError("failed-precondition", "Chore must be in submitted status");
    }

    const userId = choreData.assignedTo;
    const pointValue = choreData.pointValue || 0;

    await db.runTransaction(async (transaction) => {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) throw new HttpsError("not-found", "User not found");

      const currentPoints = userDoc.data()?.points || 0;

      transaction.update(choreRef, {
        status: "approved",
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        approvedBy: request.auth?.uid || null,
      });

      transaction.update(userRef, {
        points: currentPoints + pointValue,
      });
    });

    logger.info(`Chore ${choreId} approved for ${userId}`);
    return {
      success: true,
      pointsAwarded: pointValue,
      message: `Chore approved and ${pointValue} points awarded!`,
    };
  } catch (error) {
    logger.error("Error approving chore:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to approve chore");
  }
});

/**
 * Assign a random avatar to a user
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

  const randomStyle = avatarStyles[Math.floor(Math.random() * avatarStyles.length)];
  const seed = request.auth.uid;

  const avatar = {
    type: "dicebear",
    style: randomStyle,
    seed: seed,
    url: `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${seed}`,
  };

  return {avatar};
});

/**
 * Fetch a daily meme from an API and store it in Firestore
 * Runs daily at midnight UTC
 */
export const fetchDailyMeme = onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "UTC",
  },
  async () => {
    try {
      logger.info("Fetching daily meme...");
      const subreddits = "wholesomememes+memes+foodmemes+aww+rarepuppers+AnimalsBeingDerps";
      const response = await fetch(`https://meme-api.com/gimme/${subreddits}`);

      if (!response.ok) {
        throw new Error(`Meme API error: ${response.statusText}`);
      }

      const memeData = await response.json();

      if (memeData.nsfw) {
        logger.warn("Got NSFW meme, fetching another...");
        const retryResponse = await fetch(`https://meme-api.com/gimme/${subreddits}`);
        const retryData = await retryResponse.json();
        if (!retryData.nsfw) {
          Object.assign(memeData, retryData);
        } else {
          throw new Error("No SFW memes found");
        }
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
    const subreddits = "wholesomememes+memes+foodmemes+aww+rarepuppers+AnimalsBeingDerps";
    const response = await fetch(`https://meme-api.com/gimme/${subreddits}`);

    logger.info("Meme API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Meme API error response:", errorText);
      throw new HttpsError("unavailable", `Meme API error: ${response.statusText}`);
    }

    const memeData = await response.json();
    logger.info("Meme data received:", memeData.title);

    if (memeData.nsfw) {
      logger.warn("Got NSFW meme, fetching another...");
      const retryResponse = await fetch(`https://meme-api.com/gimme/${subreddits}`);
      const retryData = await retryResponse.json();
      if (retryData.nsfw) {
        throw new HttpsError("not-found", "No SFW memes found after retry");
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

    return {
      success: true,
      meme: {
        title: memeData.title,
        url: memeData.url,
      },
    };
  } catch (error) {
    logger.error("Error fetching daily meme:", error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new HttpsError("internal", `Failed to fetch meme: ${errorMessage}`);
  }
});

/**
 * Securely searches The Movie Database (TMDB) for movie information.
 * @type {functions.HttpsFunction}
 */
export const searchMovies = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required to search.');
  }

  const { query: searchQuery } = request.data;
  if (!searchQuery) {
    return { results: [] };
  }

  // Access TMDB_KEY from environment (set via Secret Manager in Cloud Run)
  const tmdbKey = process.env.TMDB_KEY; 
  
  if (!tmdbKey) {
    // If key is not found, log clearly and send diagnostic error back
    logger.error("TMDB_KEY is not set in process.env. Cannot perform TMDB search.");
    throw new HttpsError('internal', 'TMDB API key not configured.'); 
  }

  try {
    // TMDB API Key v3 must be passed as 'api_key'
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(searchQuery)}&language=en-US`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      logger.error(`TMDB API Error: ${response.status} - ${response.statusText}`);
      
      // Check for 401 explicitly to guide user if the key itself is wrong
      if (response.status === 401) {
          throw new HttpsError('unauthenticated', 'TMDB API key is invalid.');
      }
      throw new HttpsError('unavailable', 'Movie search service is temporarily unavailable.');
    }

    const data = await response.json();
    
    // Process and return only the necessary fields
    const results = data.results.slice(0, 5).map((movie: any) => ({
      id: movie.id.toString(),
      title: movie.title,
      releaseDate: movie.release_date,
      posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : null,
      rating: movie.vote_average,
      overview: movie.overview,
    }));

    return { results };

  } catch (error) {
    logger.error("TMDB search failed:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to perform movie search.');
  }
});

/**
 * Get detailed movie information from TMDB
 * Fetches: genres, runtime, tagline, certification, director, screenplay
 */
export const getMovieDetails = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const { movieId } = request.data;
  if (!movieId) {
    throw new HttpsError('invalid-argument', 'Movie ID is required.');
  }

  const tmdbKey = process.env.TMDB_KEY;

  if (!tmdbKey) {
    logger.error("TMDB_KEY is not set in process.env.");
    throw new HttpsError('internal', 'TMDB API key not configured.');
  }

  try {
    // Fetch all movie data in a single API call using append_to_response
    const detailsUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${tmdbKey}&language=en-US&append_to_response=release_dates,credits`;
    const detailsResponse = await fetch(detailsUrl);

    if (!detailsResponse.ok) {
      logger.error(`TMDB API Error (details): ${detailsResponse.status} - ${detailsResponse.statusText}`);
      throw new HttpsError('unavailable', 'Failed to fetch movie details.');
    }

    const details = await detailsResponse.json();

    // Extract certification from release_dates
    let certification = null;
    if (details.release_dates?.results) {
      const usRelease = details.release_dates.results.find((r: any) => r.iso_3166_1 === 'US');
      if (usRelease && usRelease.release_dates.length > 0) {
        const certData = usRelease.release_dates.find((rd: any) => rd.certification);
        certification = certData?.certification || null;
      }
    }

    // Extract director and screenplay from credits
    let director = null;
    let screenplay = [];

    if (details.credits?.crew) {
      // Find director
      const directorData = details.credits.crew.find((person: any) => person.job === 'Director');
      director = directorData?.name || null;

      // Find screenplay writers
      const screenplayWriters = details.credits.crew.filter((person: any) =>
        person.job === 'Screenplay' || person.job === 'Writer'
      );
      screenplay = screenplayWriters.map((writer: any) => writer.name);
    }

    // Prepare response with all detailed data
    return {
      genres: details.genres?.map((g: any) => g.name) || [],
      runtime: details.runtime || null,
      tagline: details.tagline || null,
      certification,
      director,
      screenplay: screenplay.length > 0 ? screenplay : null,
    };

  } catch (error) {
    logger.error("Failed to fetch movie details:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to fetch movie details.');
  }
});


/**
 * Create a Google Calendar for a family
 */
export const createFamilyCalendar = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be authenticated");
  const {familyId, familyName} = request.data;
  if (!familyId || !familyName) throw new HttpsError("invalid-argument", "familyId required");

  try {
    logger.info(`Creating Google Calendar for family: ${familyId}`);
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    const calendar = google.calendar({version: "v3", auth});

    const calendarResponse = await calendar.calendars.insert({
      requestBody: {
        summary: `${familyName} Calendar`,
        description: `Shared family calendar for ${familyName}`,
        timeZone: "America/New_York",
      },
    });

    const calendarId = calendarResponse.data.id;
    
    await calendar.acl.insert({
      calendarId: calendarId as string,
      requestBody: {
        role: "reader",
        scope: { type: "default" },
      },
    });

    await db.collection("families").doc(familyId).update({
      googleCalendarId: calendarId,
      calendarCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, calendarId: calendarId };
  } catch (error) {
    logger.error("Error creating calendar:", error);
    throw new HttpsError("internal", "Failed to create calendar");
  }
});

/**
 * Sync a Firestore event to Google Calendar
 */
export const syncEventToGoogleCalendar = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");
  const {familyId, eventId, eventData} = request.data;
  if (!familyId || !eventId || !eventData) throw new HttpsError("invalid-argument", "Missing args");

  try {
    const familyDoc = await db.collection("families").doc(familyId).get();
    const familyData = familyDoc.data();
    if (!familyData?.googleCalendarId) throw new HttpsError("failed-precondition", "No calendar");

    const calendarId = familyData.googleCalendarId;
    const auth = new google.auth.GoogleAuth({ scopes: ["https://www.googleapis.com/auth/calendar"] });
    const calendar = google.calendar({version: "v3", auth});

    const googleEvent = {
      summary: eventData.title,
      description: eventData.description || "",
      start: { dateTime: eventData.start, timeZone: "America/New_York" },
      end: { dateTime: eventData.end, timeZone: "America/New_York" },
    };

    if (eventData.googleEventId) {
      await calendar.events.update({
        calendarId: calendarId,
        eventId: eventData.googleEventId,
        requestBody: googleEvent,
      });
    } else {
      const response = await calendar.events.insert({
        calendarId: calendarId,
        requestBody: googleEvent,
      });
      await db.collection("families").doc(familyId).collection("calendar-events").doc(eventId).update({
        googleEventId: response.data.id,
      });
    }
    return {success: true};
  } catch (error) {
    logger.error("Sync error:", error);
    throw new HttpsError("internal", "Failed to sync event");
  }
});

/**
 * Delete an event from Google Calendar
 */
export const deleteEventFromGoogleCalendar = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");
  const {familyId, googleEventId} = request.data;
  if (!familyId || !googleEventId) throw new HttpsError("invalid-argument", "Missing args");

  try {
    const familyDoc = await db.collection("families").doc(familyId).get();
    const familyData = familyDoc.data();
    if (!familyData?.googleCalendarId) throw new HttpsError("failed-precondition", "No calendar");

    const calendarId = familyData.googleCalendarId;
    const auth = new google.auth.GoogleAuth({ scopes: ["https://www.googleapis.com/auth/calendar"] });
    const calendar = google.calendar({version: "v3", auth});

    await calendar.events.delete({ calendarId: calendarId, eventId: googleEventId });
    return {success: true};
  } catch (error) {
    logger.error("Delete error:", error);
    throw new HttpsError("internal", "Failed to delete event");
  }
});

/**
 * Setup Google Calendar for a family
 * Creates a new Google Calendar and returns the calendar ID
 */
export const setupGoogleCalendar = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");
  const {familyId} = request.data;
  if (!familyId) throw new HttpsError("invalid-argument", "Missing familyId");

  try {
    // Get family data to use family name in calendar
    const familyDoc = await db.collection("families").doc(familyId).get();
    const familyData = familyDoc.data();
    const familyName = familyData?.name || "Family";

    const auth = new google.auth.GoogleAuth({ scopes: ["https://www.googleapis.com/auth/calendar"] });
    const calendar = google.calendar({version: "v3", auth});

    // Create a new calendar for the family
    const newCalendar = await calendar.calendars.insert({
      requestBody: {
        summary: `${familyName} Calendar`,
        description: `Shared family calendar for ${familyName} - managed by FamBam`,
        timeZone: "America/New_York",
      },
    });

    const calendarId = newCalendar.data.id;

    if (!calendarId) {
      throw new HttpsError("internal", "Failed to create calendar");
    }

    // Make the calendar publicly readable (so family members can subscribe)
    await calendar.acl.insert({
      calendarId: calendarId,
      requestBody: {
        role: "reader",
        scope: {
          type: "default",
        },
      },
    });

    logger.info(`Created Google Calendar for family ${familyId}: ${calendarId}`);

    return {
      success: true,
      calendarId: calendarId,
    };
  } catch (error) {
    logger.error("Setup Google Calendar error:", error);
    throw new HttpsError("internal", "Failed to setup Google Calendar");
  }
});

async function sendNotificationToUser(userId: string, title: string, body: string, data?: Record<string, string>) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    if (!userData?.fcmToken || !userData?.notificationsEnabled) return null;

    const message = {
      token: userData.fcmToken,
      notification: { title, body },
      data: data || {},
      webpush: { fcmOptions: { link: data?.url || "/dashboard" } },
    };
    return await admin.messaging().send(message);
  } catch (error) {
    logger.error(`Notification error for ${userId}:`, error);
    return null;
  }
}

export const onChoreAssigned = onDocumentCreated("families/{familyId}/chores/{choreId}", async (event) => {
  const choreData = event.data?.data();
  if (!choreData?.assignedTo) return;
  await sendNotificationToUser(choreData.assignedTo, "🧹 New Chore Assigned", `Assigned: ${choreData.title}`, {
    type: "chore_assigned", choreId: event.params.choreId, url: "/chores"
  });
});

export const onChoreUpdated = onDocumentUpdated("families/{familyId}/chores/{choreId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  if (before.assignedTo !== after.assignedTo && after.assignedTo) {
    await sendNotificationToUser(after.assignedTo, "🧹 Chore Reassigned", `Assigned: ${after.title}`, {
      type: "chore_reassigned", choreId: event.params.choreId, url: "/chores"
    });
  }

  if (before.status !== "approved" && after.status === "approved" && after.assignedTo) {
    await sendNotificationToUser(after.assignedTo, "✅ Chore Approved!", `Earned ${after.pointValue || 0} pts!`, {
      type: "chore_approved", choreId: event.params.choreId, points: String(after.pointValue), url: "/chores"
    });
  }
});

export const onTodoAssigned = onDocumentCreated("families/{familyId}/todos/{todoId}", async (event) => {
  const data = event.data?.data();
  if (!data?.assignedTo) return;
  await sendNotificationToUser(data.assignedTo, "✅ New To-Do", `Assigned: ${data.title}`, {
    type: "todo_assigned", todoId: event.params.todoId, url: "/todos"
  });
});

export const onTodoUpdated = onDocumentUpdated("families/{familyId}/todos/{todoId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  if (before.assignedTo !== after.assignedTo && after.assignedTo) {
    await sendNotificationToUser(after.assignedTo, "✅ To-Do Reassigned", `Assigned: ${after.title}`, {
      type: "todo_reassigned", todoId: event.params.todoId, url: "/todos"
    });
  }
});

export const sendCalendarReminders = onSchedule({ schedule: "0 * * * *", timeZone: "America/New_York" }, async () => {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const familiesSnapshot = await db.collection("families").get();

  for (const familyDoc of familiesSnapshot.docs) {
    const eventsSnapshot = await db.collection("families").doc(familyDoc.id).collection("calendar-events")
      .where("start", ">=", now.toISOString()).where("start", "<=", oneHourLater.toISOString()).get();

    for (const eventDoc of eventsSnapshot.docs) {
      const eventData = eventDoc.data();
      if (eventData.reminderSent) continue;
      const members = familyDoc.data().members || [];
      for (const memberId of members) {
        await sendNotificationToUser(memberId, "📅 Upcoming Event", `${eventData.title} starts in 1h`, {
          type: "calendar_reminder", eventId: eventDoc.id, url: "/calendar"
        });
      }
      await eventDoc.ref.update({ reminderSent: true });
    }
  }
});

export const deleteMemory = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");
  const {familyId, memoryId, storagePath} = request.data;
  if (!familyId || !memoryId || !storagePath) throw new HttpsError("invalid-argument", "Missing args");

  try {
    const memoryRef = db.collection("families").doc(familyId).collection("memories").doc(memoryId);
    const docSnap = await memoryRef.get();
    if (!docSnap.exists) throw new HttpsError("not-found", "Memory not found");
    if (docSnap.data()?.uploadedBy !== request.auth.uid) throw new HttpsError("permission-denied", "Not your memory");

    await memoryRef.delete();
    const bucket = admin.storage().bucket();
    await bucket.file(storagePath).delete();
    return {success: true};
  } catch (error) {
    logger.error("Error deleting memory:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to delete memory");
  }
});

export const sendMedicationReminders = onSchedule(
  { 
    // FIX: Changed from "* * * * *" (every minute) to every 5 minutes
    schedule: "*/5 * * * *", 
    timeZone: "America/New_York" 
  }, 
  async () => {
    const now = new Date();
    const timeString = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const medsSnapshot = await db.collectionGroup("medications").get();

    for (const doc of medsSnapshot.docs) {
      const data = doc.data();

      // Fix: Use correct field names and add null checks
      if (!data.times || !Array.isArray(data.times) || !data.assignedTo) {
        continue; // Skip medications without proper reminder times or assignment
      }

      if (data.times.includes(timeString)) {
        const last = data.lastNotifiedAt?.toDate();
        if (last && (now.getTime() - last.getTime()) / 60000 < 1) continue;

        await sendNotificationToUser(
          data.assignedTo,
          "💊 Med Reminder",
          `Take ${data.name} (${data.dosage})`,
          {
            type: "med_reminder",
            medicationId: doc.id,
            url: "/medication"
          }
        );
        await doc.ref.update({ lastNotifiedAt: admin.firestore.FieldValue.serverTimestamp() });
      }
    }
});