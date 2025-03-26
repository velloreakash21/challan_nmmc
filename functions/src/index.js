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

// Import controllers
const authController = require('./controllers/auth.controller');
const challanController = require('./controllers/challan.controller');
const paymentController = require('./controllers/payment.controller');
const dashboardController = require('./controllers/dashboard.controller');

// Auth Routes
exports.createUserAccount = functions.https.onCall(authController.createUserAccount);
exports.loginWithPhone = functions.https.onCall(authController.loginWithPhone);
exports.verifyPhoneOTP = functions.https.onCall(authController.verifyPhoneOTP);

// Challan Routes
exports.createPersonChallan = functions.https.onCall(challanController.createPersonChallan);
exports.createShopChallan = functions.https.onCall(challanController.createShopChallan);
exports.getUserChallans = functions.https.onCall(challanController.getUserChallans);
exports.getChallanDetails = functions.https.onCall(challanController.getChallanDetails);
exports.uploadChallanPhotos = functions.https.onCall(challanController.uploadChallanPhotos);

// Payment Routes
exports.initiatePayment = functions.https.onCall(paymentController.initiatePayment);
exports.verifyPayment = functions.https.onRequest(paymentController.verifyPayment);
exports.getPaymentReceipt = functions.https.onCall(paymentController.getPaymentReceipt);

// Dashboard Routes
exports.getDashboardStats = functions.https.onCall(dashboardController.getDashboardStats);

// API endpoint (Express app)
exports.api = functions.https.onRequest(app); 