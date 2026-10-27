const admin = require('firebase-admin');
const logger = require('../utils/logger');

/**
 * initFirebase
 * Initializes the Firebase Admin SDK using environment variables.
 * Call this once during server startup.
 */
const initFirebase = () => {
  if (admin.apps.length > 0) return; // Prevent re-initialization

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    logger.info('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK:', error);
  }
};

/**
 * sendPushNotification
 * Sends a single push notification to a specific device via FCM.
 *
 * @param {string} fcmToken - The FCM registration token of the target device
 * @param {string} title    - Notification title
 * @param {string} body     - Notification body text
 * @param {object} data     - Optional key-value data payload
 * @returns {Promise<string|null>} - FCM message ID on success, null on failure
 */
const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) {
    logger.warn('sendPushNotification called with no FCM token. Skipping.');
    return null;
  }

  const message = {
    token: fcmToken,
    notification: { title, body },
    data: {
      ...Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      clickAction: 'FLUTTER_NOTIFICATION_CLICK',
    },
    android: {
      priority: 'high',
      notification: { sound: 'default', channelId: 'project_management' },
    },
    apns: {
      payload: { aps: { sound: 'default', badge: 1 } },
    },
  };

  try {
    const messageId = await admin.messaging().send(message);
    logger.info(`Push notification sent [${messageId}]: "${title}" → token: ${fcmToken.slice(0, 20)}...`);
    return messageId;
  } catch (error) {
    logger.error(`Failed to send push notification to token ${fcmToken.slice(0, 20)}...:`, error);
    return null;
  }
};

/**
 * sendMulticastNotification
 * Sends the same push notification to multiple devices at once (up to 500).
 *
 * @param {string[]} fcmTokens - Array of FCM registration tokens
 * @param {string} title       - Notification title
 * @param {string} body        - Notification body text
 * @param {object} data        - Optional key-value data payload
 */
const sendMulticastNotification = async (fcmTokens, title, body, data = {}) => {
  if (!fcmTokens || fcmTokens.length === 0) return;

  const message = {
    tokens: fcmTokens,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    logger.info(
      `Multicast notification sent: ${response.successCount} success, ${response.failureCount} failed`
    );
    return response;
  } catch (error) {
    logger.error('Multicast notification failed:', error);
  }
};

/**
 * Predefined notification builders for common project events
 */
const notifications = {
  taskAssigned: (fcmToken, assigneeName, taskTitle, projectName) =>
    sendPushNotification(
      fcmToken,
      '📋 New Task Assigned',
      `${assigneeName}, you have a new task: "${taskTitle}" in ${projectName}`,
      { type: 'task_assigned', taskTitle, projectName }
    ),

  taskMoved: (fcmToken, moverName, taskTitle, toStatus) =>
    sendPushNotification(
      fcmToken,
      '🔄 Task Status Updated',
      `${moverName} moved "${taskTitle}" to ${toStatus}`,
      { type: 'task_moved', taskTitle, toStatus }
    ),

  taskDueSoon: (fcmToken, taskTitle, dueDate) =>
    sendPushNotification(
      fcmToken,
      '⏰ Task Due Soon',
      `"${taskTitle}" is due on ${dueDate}. Don't forget!`,
      { type: 'task_due_soon', taskTitle, dueDate }
    ),

  projectInvite: (fcmToken, inviterName, projectName) =>
    sendPushNotification(
      fcmToken,
      '🎉 Project Invitation',
      `${inviterName} invited you to join "${projectName}"`,
      { type: 'project_invite', projectName }
    ),
};

module.exports = { initFirebase, sendPushNotification, sendMulticastNotification, notifications };
