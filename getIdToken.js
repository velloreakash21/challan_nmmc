const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithCustomToken } = require('firebase/auth');

const serviceAccount = require('./serviceAccountKey.json');

// Initialize Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Initialize Firebase App
const firebaseConfig = {
  apiKey: "AIzaSyC1H3VJa-8TKq0MLvaQxfxdJMwXdKqUcFE",
  authDomain: "dm-pro-fa4d9.firebaseapp.com",
  projectId: "dm-pro-fa4d9",
  storageBucket: "dm-pro-fa4d9.firebasestorage.app",
  messagingSenderId: "66421234614",
  appId: "1:66421234614:web:be8bd0bc91aac757007f17",
  measurementId: "G-FW8JKTWDXE"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

const uid = 'test-user';

async function getCustomToken() {
  try {
    // Create a custom token with additional claims
    const additionalClaims = {
      premiumAccount: true,
      role: 'admin'
    };

    const customToken = await admin.auth().createCustomToken(uid, additionalClaims);
    console.log('Generated custom token. Now exchanging for ID token...\n');

    // Exchange custom token for ID token
    const userCredential = await signInWithCustomToken(auth, customToken);
    const idToken = await userCredential.user.getIdToken();
    
    console.log('Use this token in your Authorization header with Bearer prefix:\n');
    console.log(idToken);

    // Also create the user if it doesn't exist
    try {
      await admin.auth().getUser(uid);
      console.log('\nUser already exists');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        await admin.auth().createUser({
          uid: uid,
          email: 'test@example.com',
          emailVerified: true
        });
        console.log('\nUser created successfully');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

getCustomToken();