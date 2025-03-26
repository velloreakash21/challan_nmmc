# Challan System

A web-based challan management system built with Firebase and JavaScript.

## Features

- Phone number authentication
- Create person and shop challans
- View challan history
- Online payment integration
- Real-time updates

## Setup

1. Clone the repository:
```bash
git clone https://github.com/velloreakash21/challan_nmmc.git
cd challan_nmmc
```

2. Install dependencies:
```bash
cd functions
npm install
```

3. Configure Firebase:
- Create a new Firebase project
- Enable Phone Authentication
- Enable Cloud Functions
- Enable Firestore Database
- Update the Firebase configuration in `public/index.html`

4. Deploy the application:
```bash
firebase deploy
```

## Testing

For testing purposes, use the following test credentials:
- Phone Number: +919490258654
- OTP: 123456

## Technologies Used

- Firebase Authentication
- Firebase Cloud Functions
- Firebase Firestore
- Firebase Hosting
- JavaScript (ES6+)
- HTML5
- CSS3

## License

MIT License 