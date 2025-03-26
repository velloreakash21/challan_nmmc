const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Note: In a production environment, you would integrate with a real payment gateway
// This is a simplified example

/**
 * Initiate payment for a challan
 */
exports.initiatePayment = async (data, context) => {
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

        // In a real implementation, you would:
        // 1. Integrate with a payment gateway
        // 2. Create a payment session
        // 3. Return the payment gateway URL/token

        // For this example, we'll simulate a payment gateway response
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
};

/**
 * Verify payment (webhook handler)
 */
exports.verifyPayment = async (req, res) => {
    try {
        // In a real implementation, you would:
        // 1. Verify the webhook signature
        // 2. Parse the payment gateway response
        // 3. Update the payment and challan status accordingly

        const { paymentId, status, transactionId } = req.body;

        // Validate payment exists
        const paymentRef = admin.firestore().collection('payments').doc(paymentId);
        const payment = await paymentRef.get();

        if (!payment.exists) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const paymentData = payment.data();

        // Update payment status
        await paymentRef.update({
            status: status,
            transactionId,
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // If payment is successful, update challan status
        if (status === 'completed') {
            const challanSnapshot = await admin.firestore()
                .collection('challans')
                .where('challanId', '==', paymentData.challanId)
                .limit(1)
                .get();

            if (!challanSnapshot.empty) {
                await challanSnapshot.docs[0].ref.update({
                    paymentStatus: 'completed',
                    paymentId: paymentId,
                    paidAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        return res.json({ status: 'success' });

    } catch (error) {
        console.error('Error verifying payment:', error);
        return res.status(500).json({ error: error.message });
    }
};

/**
 * Get payment receipt
 */
exports.getPaymentReceipt = async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'User must be authenticated.'
            );
        }

        const { challanId } = data;

        // Get challan and payment details
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

        if (challan.paymentStatus !== 'completed') {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Payment not completed for this challan.'
            );
        }

        // Get payment details
        const paymentSnapshot = await admin.firestore()
            .collection('payments')
            .doc(challan.paymentId)
            .get();

        if (!paymentSnapshot.exists) {
            throw new functions.https.HttpsError(
                'not-found',
                'Payment details not found.'
            );
        }

        const payment = paymentSnapshot.data();

        // In a real implementation, you would:
        // 1. Generate a PDF receipt
        // 2. Upload it to Storage
        // 3. Return the download URL

        // For this example, we'll return a simulated receipt URL
        return {
            success: true,
            receiptUrl: `https://storage.googleapis.com/receipts/${challanId}.pdf`,
            receiptId: `REC-${challanId}`,
            paymentDetails: {
                amount: payment.amount,
                paymentMethod: payment.paymentMethod,
                paymentDate: payment.completedAt.toDate().toISOString(),
                status: payment.status,
                transactionId: payment.transactionId
            }
        };

    } catch (error) {
        console.error('Error getting payment receipt:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
}; 