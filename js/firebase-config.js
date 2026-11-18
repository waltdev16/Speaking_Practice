/* Firebase Web App configuration.
   Paste the values from: Firebase console → Project settings → General → Your apps → SDK setup and configuration → "Config".
   These values identify your project; they are not passwords. Access is controlled by Authentication and the
   Realtime Database Security Rules. Never put the host's email or password in this file or anywhere in the repository. */
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  databaseURL: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: ''
};

export const isFirebaseConfigured = () => !!(firebaseConfig.apiKey && firebaseConfig.databaseURL && firebaseConfig.appId);
