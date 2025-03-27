const admin = require('firebase-admin');
const functions = require('firebase-functions');

// Initiate payment
exports.initiatePayment = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated.'
      );
    }

    const { challanId } = data;
    const userId = context.auth.uid;

    if (!challanId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Challan ID is required.'
      );
    }

    // Get challan document
    const snapshot = await admin.firestore()
      .collection('challans')
      .where('challanId', '==', challanId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new functions.https.HttpsError(
        'not-found',
        'Challan not found.'
      );
    }

    const challan = snapshot.docs[0].data();

    // Check if challan is already paid
    if (challan.paymentStatus === 'paid') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Challan is already paid.'
      );
    }

    // Check if payment type is online
    if (challan.paymentType !== 'online') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Only online payments are supported.'
      );
    }

    // TODO: Integrate with payment gateway
    // For now, we'll simulate a payment
    const paymentId = `PAY-${Date.now()}`;

    // Update challan with payment details
    await snapshot.docs[0].ref.update({
      paymentStatus: 'paid',
      paymentId,
      paidAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      paymentId,
      message: 'Payment completed successfully'
    };
  } catch (error) {
    console.error('Error initiating payment:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Get payment status
exports.getPaymentStatus = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated.'
      );
    }

    const { challanId } = data;
    const userId = context.auth.uid;

    if (!challanId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Challan ID is required.'
      );
    }

    // Get challan document
    const snapshot = await admin.firestore()
      .collection('challans')
      .where('challanId', '==', challanId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new functions.https.HttpsError(
        'not-found',
        'Challan not found.'
      );
    }

    const challan = snapshot.docs[0].data();

    return {
      success: true,
      paymentStatus: challan.paymentStatus,
      paymentType: challan.paymentType,
      paymentId: challan.paymentId,
      paidAt: challan.paidAt
    };
  } catch (error) {
    console.error('Error getting payment status:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
