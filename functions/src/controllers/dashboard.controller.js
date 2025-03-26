const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * Get dashboard statistics
 */
exports.getDashboardStats = async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'User must be authenticated.'
            );
        }

        const userId = context.auth.uid;

        // Get user's challans
        const challansSnapshot = await admin.firestore()
            .collection('challans')
            .where('userId', '==', userId)
            .get();

        let stats = {
            totalChallans: 0,
            personChallans: 0,
            shopChallans: 0,
            pendingPayments: 0,
            completedPayments: 0,
            totalCollected: 0
        };

        // Calculate statistics
        challansSnapshot.forEach(doc => {
            const challan = doc.data();
            stats.totalChallans++;

            if (challan.type === 'person') {
                stats.personChallans++;
            } else if (challan.type === 'shop') {
                stats.shopChallans++;
            }

            if (challan.paymentStatus === 'pending') {
                stats.pendingPayments++;
            } else if (challan.paymentStatus === 'completed') {
                stats.completedPayments++;
                stats.totalCollected += challan.penalty;
            }
        });

        // Get recent activity (last 10 challans)
        const recentActivitySnapshot = await admin.firestore()
            .collection('challans')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        const recentActivity = [];

        recentActivitySnapshot.forEach(doc => {
            const challan = doc.data();
            recentActivity.push({
                type: 'challan_created',
                challanId: challan.challanId,
                challanType: challan.type,
                name: challan.type === 'person' ? challan.name : challan.shopName,
                amount: challan.penalty,
                timestamp: challan.createdAt.toDate().toISOString()
            });
        });

        // Get payment activity
        const recentPaymentsSnapshot = await admin.firestore()
            .collection('payments')
            .where('userId', '==', userId)
            .where('status', '==', 'completed')
            .orderBy('completedAt', 'desc')
            .limit(5)
            .get();

        recentPaymentsSnapshot.forEach(doc => {
            const payment = doc.data();
            recentActivity.push({
                type: 'payment_completed',
                challanId: payment.challanId,
                amount: payment.amount,
                paymentMethod: payment.paymentMethod,
                timestamp: payment.completedAt.toDate().toISOString()
            });
        });

        // Sort all activity by timestamp
        recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Get monthly statistics
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyChallansSnapshot = await admin.firestore()
            .collection('challans')
            .where('userId', '==', userId)
            .where('createdAt', '>=', startOfMonth)
            .get();

        const monthlyStats = {
            totalChallans: 0,
            totalAmount: 0,
            collectedAmount: 0,
            pendingAmount: 0
        };

        monthlyChallansSnapshot.forEach(doc => {
            const challan = doc.data();
            monthlyStats.totalChallans++;
            monthlyStats.totalAmount += challan.penalty;

            if (challan.paymentStatus === 'completed') {
                monthlyStats.collectedAmount += challan.penalty;
            } else {
                monthlyStats.pendingAmount += challan.penalty;
            }
        });

        return {
            stats,
            monthlyStats,
            recentActivity
        };

    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
}; 