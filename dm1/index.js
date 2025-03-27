const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

// Import controllers
const authController = require('./controllers/auth.controller');
const challanController = require('./controllers/challan.controller');
const paymentController = require('./controllers/payment.controller');
const dashboardController = require('./controllers/dashboard.controller');

// Export all functions
module.exports = {
  // Auth functions
  createUserAccount: authController.createUserAccount,
  getUserProfile: authController.getUserProfile,
  updateUserProfile: authController.updateUserProfile,

  // Challan functions
  createPersonChallan: challanController.createPersonChallan,
  createShopChallan: challanController.createShopChallan,
  getUserChallans: challanController.getUserChallans,
  getChallanDetails: challanController.getChallanDetails,

  // Payment functions
  initiatePayment: paymentController.initiatePayment,
  getPaymentStatus: paymentController.getPaymentStatus,

  // Dashboard functions
  getDashboardStats: dashboardController.getDashboardStats,
  getChallanStatsByType: dashboardController.getChallanStatsByType
};
