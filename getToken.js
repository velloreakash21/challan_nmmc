const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = 'test-user'; // This can be any string

admin.auth().createCustomToken(uid)
  .then((customToken) => {
    console.log('Custom Token:', customToken);
  })
  .catch((error) => {
    console.error('Error creating custom token:', error);
  }); 