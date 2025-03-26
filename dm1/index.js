const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Express
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth Functions
exports.createUserAccount = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Phone number must be verified first.'
      );
    }

    const { name, email, phone } = data;
    const uid = context.auth.uid;

    await admin.firestore().collection('users').doc(uid).set({
      name,
      email,
      phone,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isAdmin: false
    });

    return {
      success: true,
      userId: uid
    };
  } catch (error) {
    console.error('Error creating user account:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Challan Functions
exports.createPersonChallan = functions.https.onCall(async (data, context) => {
  try {
    console.log('[createPersonChallan] Function called with:', {
      data,
      auth: context.auth ? {
        uid: context.auth.uid,
        token: context.auth.token
      } : null
    });

    // Check authentication
    if (!context.auth) {
      console.error('[createPersonChallan] Authentication failed: No auth context');
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated.'
      );
    }

    // Get user ID from auth context
    const userId = context.auth.uid;
    console.log('[createPersonChallan] Authenticated userId:', userId);

    // Extract data from the request
    const challanData = data || {};
    console.log('[createPersonChallan] Received challan data:', challanData);

    // Validate required fields
    const requiredFields = {
      name: 'string',
      phone: 'string',
      penalty: 'number',
      reason: 'string',
      paymentType: 'string'
    };

    for (const [field, type] of Object.entries(requiredFields)) {
      if (!challanData[field]) {
        console.error(`[createPersonChallan] Missing required field: ${field}`);
        throw new functions.https.HttpsError(
          'invalid-argument',
          `${field} is required`
        );
      }
      if (typeof challanData[field] !== type || 
          (type === 'number' && challanData[field] <= 0) ||
          (type === 'string' && !challanData[field].trim())) {
        console.error(`[createPersonChallan] Invalid ${field}:`, challanData[field]);
        throw new functions.https.HttpsError(
          'invalid-argument',
          `${field} must be a valid ${type}${type === 'number' ? ' greater than 0' : ''}`
        );
      }
    }

    if (!['cash', 'online'].includes(challanData.paymentType)) {
      console.error('[createPersonChallan] Invalid payment type:', challanData.paymentType);
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Payment type must be either cash or online'
      );
    }

    // Generate Challan ID
    const prefix = 'KDP';
    const randomNum = Math.floor(1000000000 + Math.random() * 9000000000);
    const challanId = `${prefix}${randomNum}`;
    console.log('[createPersonChallan] Generated challanId:', challanId);

    // Prepare challan data for Firestore
    const firestoreChallanData = {
      challanId,
      userId,
      type: 'person',
      name: challanData.name.trim(),
      phone: challanData.phone.trim(),
      penalty: challanData.penalty,
      reason: challanData.reason.trim(),
      remarks: (challanData.remarks || '').trim(),
      paymentType: challanData.paymentType,
      paymentStatus: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    console.log('[createPersonChallan] Prepared Firestore data:', firestoreChallanData);

    // Add to Firestore
    const challanRef = await admin.firestore()
      .collection('challans')
      .add(firestoreChallanData);

    console.log('[createPersonChallan] Successfully created challan:', challanRef.id);

    // Return success response
    return {
      success: true,
      challanId,
      challan: {
        ...firestoreChallanData,
        id: challanRef.id
      }
    };

  } catch (error) {
    console.error('[createPersonChallan] Error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.getUserChallans = functions.https.onCall(async (data, context) => {
  try {
    const { type = 'all', limit = 10 } = data;
    const userId = context.auth ? context.auth.uid : 'test-user';

    let query = admin.firestore()
      .collection('challans')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (type !== 'all') {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.get();
    const challans = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      challans.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null
      });
    });

    return {
      challans
    };
  } catch (error) {
    console.error('Error getting user challans:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Payment Functions
exports.initiatePayment = functions.https.onCall(async (data, context) => {
  try {
    const { challanId, amount, paymentMethod } = data;
    const userId = context.auth ? context.auth.uid : 'test-user';

    // Validate challan exists and amount matches
    const challanSnapshot = await admin.firestore()
      .collection('challans')
      .where('challanId', '==', challanId)
      .limit(1)
      .get();

    if (challanSnapshot.empty) {
      throw new functions.https.HttpsError(
        'not-found',
        'Challan not found.'
      );
    }

    const challan = challanSnapshot.docs[0].data();

    if (challan.penalty !== amount) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Payment amount does not match challan penalty.'
      );
    }

    if (challan.paymentStatus === 'completed') {
      throw new functions.https.HttpsError(
        'already-exists',
        'Payment already completed for this challan.'
      );
    }

    // Create payment record
    const paymentData = {
      challanId,
      userId,
      amount,
      paymentMethod,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const paymentRef = await admin.firestore()
      .collection('payments')
      .add(paymentData);

    // For this example, we'll return a simulated payment gateway URL
    return {
      success: true,
      paymentId: paymentRef.id,
      paymentGatewayUrl: `https://example-payment-gateway.com/pay/${paymentRef.id}`,
      paymentToken: 'dummy-token-' + paymentRef.id
    };
  } catch (error) {
    console.error('Error initiating payment:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
