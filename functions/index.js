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
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'User must be authenticated.'
            );
        }

        const userId = context.auth.uid;
        
        // Validate required fields
        if (!data.name || typeof data.name !== 'string') {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Name is required and must be a string'
            );
        }
        if (!data.phone || typeof data.phone !== 'string') {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Phone number is required and must be a string'
            );
        }
        if (!data.penalty || typeof data.penalty !== 'number' || data.penalty <= 0) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Penalty amount is required and must be a positive number'
            );
        }
        if (!data.reason || typeof data.reason !== 'string') {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Reason is required and must be a string'
            );
        }
        if (!data.paymentType || !['cash', 'online'].includes(data.paymentType)) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Payment type must be either cash or online'
            );
        }

        // Generate Challan ID
        const prefix = 'KDP';
        const randomNum = Math.floor(1000000000 + Math.random() * 9000000000);
        const challanId = `${prefix}${randomNum}`;

        const challanData = {
            challanId,
            userId,
            type: 'person',
            name: data.name,
            phone: data.phone,
            penalty: data.penalty,
            reason: data.reason,
            remarks: data.remarks || '',
            paymentType: data.paymentType,
            paymentStatus: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const challanRef = await admin.firestore()
            .collection('challans')
            .add(challanData);

        return {
            success: true,
            challanId,
            challan: {
                ...challanData,
                id: challanRef.id
            }
        };
    } catch (error) {
        console.error('Error creating person challan:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

exports.getUserChallans = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'User must be authenticated.'
            );
        }

        const userId = context.auth.uid;
        const { type = 'all', limit = 10 } = data;

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
            challans.push({
                id: doc.id,
                ...doc.data()
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
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'User must be authenticated.'
            );
        }

        const { challanId, amount, paymentMethod } = data;

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
            userId: context.auth.uid,
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