const admin = require('firebase-admin');
const functions = require('firebase-functions');

// Get dashboard statistics
exports.getDashboardStats = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated.'
      );
    }

    const userId = context.auth.uid;

    // Get total challans
    const totalChallansSnapshot = await admin.firestore()
      .collection('challans')
      .where('userId', '==', userId)
      .count()
      .get();

    // Get pending challans
    const pendingChallansSnapshot = await admin.firestore()
      .collection('challans')
      .where('userId', '==', userId)
      .where('paymentStatus', '==', 'pending')
      .count()
      .get();

    // Get paid challans
    const paidChallansSnapshot = await admin.firestore()
      .collection('challans')
      .where('userId', '==', userId)
      .where('paymentStatus', '==', 'paid')
      .count()
      .get();

    // Get total amount collected
    const paidChallansSnapshot2 = await admin.firestore()
      .collection('challans')
      .where('userId', '==', userId)
      .where('paymentStatus', '==', 'paid')
      .get();

    const totalAmount = paidChallansSnapshot2.docs.reduce((sum, doc) => {
      return sum + doc.data().penalty;
    }, 0);

    // Get recent challans
    const recentChallansSnapshot = await admin.firestore()
      .collection('challans')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const recentChallans = recentChallansSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      stats: {
        totalChallans: totalChallansSnapshot.data().count,
        pendingChallans: pendingChallansSnapshot.data().count,
        paidChallans: paidChallansSnapshot.data().count,
        totalAmount
      },
      recentChallans
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Get challan statistics by type
exports.getChallanStatsByType = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated.'
      );
    }

    const userId = context.auth.uid;

    // Get person challans stats
    const personChallansSnapshot = await admin.firestore()
      .collection('challans')
      .where('userId', '==', userId)
      .where('type', '==', 'person')
      .get();

    const personChallans = personChallansSnapshot.docs.map(doc => doc.data());

    // Get shop challans stats
    const shopChallansSnapshot = await admin.firestore()
      .collection('challans')
      .where('userId', '==', userId)
      .where('type', '==', 'shop')
      .get();

    const shopChallans = shopChallansSnapshot.docs.map(doc => doc.data());

    // Calculate statistics
    const stats = {
      person: {
        total: personChallans.length,
        pending: personChallans.filter(c => c.paymentStatus === 'pending').length,
        paid: personChallans.filter(c => c.paymentStatus === 'paid').length,
        totalAmount: personChallans.reduce((sum, c) => sum + c.penalty, 0)
      },
      shop: {
        total: shopChallans.length,
        pending: shopChallans.filter(c => c.paymentStatus === 'pending').length,
        paid: shopChallans.filter(c => c.paymentStatus === 'paid').length,
        totalAmount: shopChallans.reduce((sum, c) => sum + c.penalty, 0)
      }
    };

    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Error getting challan stats by type:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
