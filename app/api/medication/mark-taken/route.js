import { db } from '../../../../lib/firebase';
import { doc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(req) {
  try {
    const { medicationId, scheduledTime, userId } = await req.json();

    if (!medicationId || !scheduledTime || !userId) {
      return new Response(JSON.stringify({ message: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the user's familyId
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return new Response(JSON.stringify({ message: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const userData = userDoc.data();
    const familyId = userData.familyId;

    if (!familyId) {
      return new Response(JSON.stringify({ message: 'User is not part of a family' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const medicationRef = doc(db, 'families', familyId, 'medications', medicationId);

    await addDoc(collection(medicationRef, 'taken_log'), {
      takenAt: serverTimestamp(),
      takenBy: userId, // The user who marked it as taken
      scheduledTime: scheduledTime,
    });

    return new Response(JSON.stringify({ message: 'Medication marked as taken successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error marking medication as taken:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
