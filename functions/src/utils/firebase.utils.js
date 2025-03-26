const admin = require('firebase-admin');

/**
 * Get Firestore instance
 */
const getFirestore = () => admin.firestore();

/**
 * Get Storage bucket instance
 */
const getStorageBucket = () => admin.storage().bucket();

/**
 * Create a Firestore timestamp
 */
const createTimestamp = () => admin.firestore.FieldValue.serverTimestamp();

/**
 * Convert Firestore timestamp to ISO string
 * @param {FirebaseFirestore.Timestamp} timestamp 
 */
const timestampToISOString = (timestamp) => {
    if (!timestamp) return null;
    return timestamp.toDate().toISOString();
};

/**
 * Verify Firebase ID token
 * @param {string} idToken 
 */
const verifyIdToken = async (idToken) => {
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken;
    } catch (error) {
        console.error('Error verifying ID token:', error);
        throw error;
    }
};

/**
 * Get user by UID
 * @param {string} uid 
 */
const getUserByUid = async (uid) => {
    try {
        const userRecord = await admin.auth().getUser(uid);
        return userRecord;
    } catch (error) {
        console.error('Error fetching user data:', error);
        throw error;
    }
};

/**
 * Create custom token
 * @param {string} uid 
 * @param {Object} additionalClaims 
 */
const createCustomToken = async (uid, additionalClaims = {}) => {
    try {
        const customToken = await admin.auth().createCustomToken(uid, additionalClaims);
        return customToken;
    } catch (error) {
        console.error('Error creating custom token:', error);
        throw error;
    }
};

module.exports = {
    getFirestore,
    getStorageBucket,
    createTimestamp,
    timestampToISOString,
    verifyIdToken,
    getUserByUid,
    createCustomToken
}; 