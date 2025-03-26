const functions = require('firebase-functions');
const admin = require('firebase-admin');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate unique challan ID
 */
const generateChallanId = () => {
    const prefix = 'KDP'; // Can be based on city/location
    const randomNum = Math.floor(1000000000 + Math.random() * 9000000000);
    return `${prefix}${randomNum}`;
};

/**
 * Create person-wise challan
 */
exports.createPersonChallan = async (data, context) => {
    try {
        // Modified auth check to handle both ID tokens and custom tokens
        let userId;
        if (context.auth) {
            userId = context.auth.uid;
        } else {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'User must be authenticated.'
            );
        }

        // Extract data from the request
        const challanData = data || {};

        // Validate required fields
        if (!challanData.name || typeof challanData.name !== 'string') {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Name is required and must be a string'
            );
        }
        if (!challanData.phone || typeof challanData.phone !== 'string') {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Phone number is required and must be a string'
            );
        }
        if (!challanData.penalty || typeof challanData.penalty !== 'number' || challanData.penalty <= 0) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Penalty amount is required and must be a positive number'
            );
        }
        if (!challanData.reason || typeof challanData.reason !== 'string') {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Reason is required and must be a string'
            );
        }
        if (!challanData.paymentType || !['cash', 'online'].includes(challanData.paymentType)) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Payment type must be either cash or online'
            );
        }

        // Generate Challan ID
        const prefix = 'KDP';
        const randomNum = Math.floor(1000000000 + Math.random() * 9000000000);
        const challanId = `${prefix}${randomNum}`;

        // Prepare challan data for Firestore
        const firestoreChallanData = {
            challanId,
            userId,
            type: 'person',
            name: challanData.name,
            phone: challanData.phone,
            penalty: challanData.penalty,
            reason: challanData.reason,
            remarks: challanData.remarks || '',
            paymentType: challanData.paymentType,
            paymentStatus: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const challanRef = await admin.firestore()
            .collection('challans')
            .add(firestoreChallanData);

        // Generate QR Code
        const qrData = JSON.stringify({
            challanId,
            type: 'person',
            amount: challanData.penalty,
            timestamp: Date.now()
        });

        const qrCodeBuffer = await QRCode.toBuffer(qrData);

        // Upload QR code to Storage
        const qrCodeFilename = `qr-codes/${challanId}.png`;
        const bucket = admin.storage().bucket();
        const file = bucket.file(qrCodeFilename);

        await file.save(qrCodeBuffer, {
            metadata: {
                contentType: 'image/png',
            },
        });

        // Get public URL
        await file.makePublic();
        const qrCodeUrl = `https://storage.googleapis.com/${bucket.name}/${qrCodeFilename}`;

        // Update challan with QR URL
        await challanRef.update({ qrCodeUrl });

        return {
            success: true,
            challanId,
            challan: {
                ...firestoreChallanData,
                id: challanRef.id,
                qrCodeUrl
            }
        };

    } catch (error) {
        console.error('Error creating person challan:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
};

/**
 * Create shop-wise challan
 */
exports.createShopChallan = async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'User must be authenticated.'
            );
        }

        const userId = context.auth.uid;
        const {
            shopName,
            contactPerson,
            phone,
            addressId,
            penalty,
            reason,
            remarks,
            paymentType
        } = data;

        // Similar logic to createPersonChallan
        let addressText = '';
        if (addressId) {
            const addressSnapshot = await admin.firestore()
                .collection('addresses')
                .doc(addressId)
                .get();

            if (addressSnapshot.exists) {
                const address = addressSnapshot.data();
                addressText = `${address.street}, ${address.city}, ${address.state}, ${address.country}, ${address.zipcode}`;
            }
        }

        const challanId = generateChallanId();

        const challanData = {
            challanId,
            userId,
            type: 'shop',
            shopName,
            contactPerson,
            phone,
            addressId: addressId || null,
            addressText,
            penalty,
            reason,
            remarks: remarks || '',
            paymentType,
            paymentStatus: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const challanRef = await admin.firestore()
            .collection('challans')
            .add(challanData);

        // Generate and upload QR code (similar to person challan)
        const qrData = JSON.stringify({
            challanId,
            type: 'shop',
            amount: penalty,
            timestamp: Date.now()
        });

        const qrCodeBuffer = await QRCode.toBuffer(qrData);
        const qrCodeFilename = `qr-codes/${challanId}.png`;
        const bucket = admin.storage().bucket();
        const file = bucket.file(qrCodeFilename);

        await file.save(qrCodeBuffer, {
            metadata: {
                contentType: 'image/png',
            },
        });

        await file.makePublic();
        const qrCodeUrl = `https://storage.googleapis.com/${bucket.name}/${qrCodeFilename}`;

        await challanRef.update({ qrCodeUrl });

        return {
            success: true,
            challanId,
            challan: {
                ...challanData,
                id: challanRef.id,
                qrCodeUrl
            }
        };

    } catch (error) {
        console.error('Error creating shop challan:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
};

/**
 * Get user's challans
 */
exports.getUserChallans = async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'User must be authenticated.'
            );
        }

        const userId = context.auth.uid;
        const { type = 'all', limit = 10, startAfter = null } = data;

        let query = admin.firestore()
            .collection('challans')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(limit);

        if (type !== 'all') {
            query = query.where('type', '==', type);
        }

        if (startAfter) {
            const startAfterDoc = await admin.firestore()
                .collection('challans')
                .doc(startAfter)
                .get();
            query = query.startAfter(startAfterDoc);
        }

        const snapshot = await query.get();
        const challans = [];
        let lastVisible = null;

        snapshot.forEach(doc => {
            challans.push({
                id: doc.id,
                ...doc.data()
            });
            lastVisible = doc;
        });

        return {
            challans,
            lastVisible: lastVisible ? lastVisible.id : null,
            hasMore: challans.length === limit
        };

    } catch (error) {
        console.error('Error getting user challans:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
};

/**
 * Get challan details
 */
exports.getChallanDetails = async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'User must be authenticated.'
            );
        }

        const { challanId } = data;

        // Get challan document
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

        const challanDoc = challanSnapshot.docs[0];
        const challan = {
            id: challanDoc.id,
            ...challanDoc.data()
        };

        // Get challan photos
        const photosSnapshot = await admin.firestore()
            .collection('challanPhotos')
            .where('challanId', '==', challanId)
            .get();

        const photos = [];
        photosSnapshot.forEach(doc => {
            photos.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return {
            challan,
            photos
        };

    } catch (error) {
        console.error('Error getting challan details:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
};

/**
 * Upload challan photos
 */
exports.uploadChallanPhotos = async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'User must be authenticated.'
            );
        }

        const { challanId, photos } = data;

        // Validate challan exists
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

        const photoUrls = [];
        const bucket = admin.storage().bucket();

        // Upload each photo
        for (const [index, photoBase64] of photos.entries()) {
            const photoBuffer = Buffer.from(photoBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
            const photoId = uuidv4();
            const filename = `challan-photos/${challanId}/${photoId}.jpg`;
            const file = bucket.file(filename);

            await file.save(photoBuffer, {
                metadata: {
                    contentType: 'image/jpeg',
                }
            });

            await file.makePublic();
            const photoUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

            // Save photo reference in Firestore
            await admin.firestore()
                .collection('challanPhotos')
                .add({
                    challanId,
                    photoUrl,
                    photoId,
                    index,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });

            photoUrls.push(photoUrl);
        }

        return {
            success: true,
            photoUrls
        };

    } catch (error) {
        console.error('Error uploading challan photos:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
}; 