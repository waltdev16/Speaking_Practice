/* Firebase Web App configuration.
   Paste the values from: Firebase console → Project settings → General → Your apps → SDK setup and configuration → "Config".
   These values identify your project; they are not passwords. Access is controlled by Authentication and the
   Realtime Database Security Rules. Never put the host's email or password in this file or anywhere in the repository. */
export const firebaseConfig = {
  apiKey: 'AIzaSyAept2OW5raUMjAvZfLEOFqHiX-v3GcOU0',
  authDomain: 'toeic-detective-duel.firebaseapp.com',
  databaseURL: 'https://toeic-detective-duel-default-rtdb.firebaseio.com',
  projectId: 'toeic-detective-duel',
  storageBucket: 'toeic-detective-duel.firebasestorage.app',
  messagingSenderId: '379105141716',
  appId: '1:379105141716:web:7bae42375c5f234d7c2c41'
};

export const isFirebaseConfigured = () => !!(firebaseConfig.apiKey && firebaseConfig.databaseURL && firebaseConfig.appId);
