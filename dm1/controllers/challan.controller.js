const admin = require('firebase-admin');
const functions = require('firebase-functions');

// Create person challan
exports.createPersonChallan = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated.'
      );
    }

    const { name, phone, penalty, reason, remarks, paymentType } = data;
    const userId = context.auth.uid;

    // Validate required fields
    if (!name || !phone || !penalty || !reason || !paymentType) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'All required fields must be provided.'
      );
    }

    // Validate payment type
    if (!['cash', 'online'].includes(paymentType)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Payment type must be either cash or online.'
      );
    }

    // Generate Challan ID
    const prefix = 'KDP';
    const randomNum = Math.floor(1000000000 + Math.random() * 9000000000);
    const challanId = `${prefix}${randomNum}`;

    // Create challan document
    const challanRef = await admin.firestore().collection('challans').add({
      challanId,
      userId,
      type: 'person',
      name: name.trim(),
      phone: phone.trim(),
      penalty: Number(penalty),
      reason: reason.trim(),
      remarks: remarks ? remarks.trim() : '',
      paymentType,
      paymentStatus: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      challanId,
      challan: {
        id: challanRef.id,
        challanId,
        userId,
        type: 'person',
        name: name.trim(),
        phone: phone.trim(),
        penalty: Number(penalty),
        reason: reason.trim(),
        remarks: remarks ? remarks.trim() : '',
        paymentType,
        paymentStatus: 'pending'
      }
    };
  } catch (error) {
    console.error('Error creating person challan:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Create shop challan
exports.createShopChallan = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated.'
      );
    }

    const { shopName, address, penalty, reason, remarks, paymentType } = data;
    const userId = context.auth.uid;

    // Validate required fields
    if (!shopName || !address || !penalty || !reason || !paymentType) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'All required fields must be provided.'
      );
    }

    // Validate payment type
    if (!['cash', 'online'].includes(paymentType)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Payment type must be either cash or online.'
      );
    }

    // Generate Challan ID
    const prefix = 'KDS';
    const randomNum = Math.floor(1000000000 + Math.random() * 9000000000);
    const challanId = `${prefix}${randomNum}`;

    // Create challan document
    const challanRef = await admin.firestore().collection('challans').add({
      challanId,
      userId,
      type: 'shop',
      shopName: shopName.trim(),
      address: address.trim(),
      penalty: Number(penalty),
      reason: reason.trim(),
      remarks: remarks ? remarks.trim() : '',
      paymentType,
      paymentStatus: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      challanId,
      challan: {
        id: challanRef.id,
        challanId,
        userId,
        type: 'shop',
        shopName: shopName.trim(),
        address: address.trim(),
        penalty: Number(penalty),
        reason: reason.trim(),
        remarks: remarks ? remarks.trim() : '',
        paymentType,
        paymentStatus: 'pending'
      }
    };
  } catch (error) {
    console.error('Error creating shop challan:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Get user's challans
exports.getUserChallans = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated.'
      );
    }

    const userId = context.auth.uid;
    const { type, status } = data;

    // Build query
    let query = admin.firestore()
      .collection('challans')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc');

    // Add type filter if specified
    if (type) {
      query = query.where('type', '==', type);
    }

    // Add status filter if specified
    if (status) {
      query = query.where('paymentStatus', '==', status);
    }

    // Get challans
    const snapshot = await query.get();
    const challans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      challans
    };
  } catch (error) {
    console.error('Error getting user challans:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Get challan details
exports.getChallanDetails = functions.https.onCall(async (data, context) => {
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
      challan: {
        id: snapshot.docs[0].id,
        ...challan
      }
    };
  } catch (error) {
    console.error('Error getting challan details:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
