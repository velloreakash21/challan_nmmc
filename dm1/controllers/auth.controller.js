const admin = require('firebase-admin');
const functions = require('firebase-functions');

// Create user account
exports.createUserAccount = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated.'
      );
    }

    const { name, email, phone } = data;
    const userId = context.auth.uid;

    // Validate required fields
    if (!name || !phone) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Name and phone number are required.'
      );
    }

    // Create or update user document in Firestore
    const userRef = admin.firestore().collection('users').doc(userId);
    await userRef.set({
      name,
      email: email || null,
      phone,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return {
      success: true,
      message: 'User account created/updated successfully'
    };
  } catch (error) {
    console.error('Error creating user account:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Get user profile
exports.getUserProfile = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated.'
      );
    }

    const userId = context.auth.uid;

    // Get user document from Firestore
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User profile not found.'
      );
    }

    return {
      success: true,
      user: userDoc.data()
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Update user profile
exports.updateUserProfile = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated.'
      );
    }

    const { name, email, phone } = data;
    const userId = context.auth.uid;

    // Validate required fields
    if (!name || !phone) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Name and phone number are required.'
      );
    }

    // Update user document in Firestore
    const userRef = admin.firestore().collection('users').doc(userId);
    await userRef.update({
      name,
      email: email || null,
      phone,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: 'User profile updated successfully'
    };
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
