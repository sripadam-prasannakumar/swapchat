import { useEffect, useRef, useContext } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { SettingsContext } from '../context/SettingsContext';

const NotificationManager = () => {
    const { currentUser } = useAuth();
    const { settings } = useContext(SettingsContext);
    const prevUnreadRef = useRef({});

    useEffect(() => {
        if (!currentUser || !settings || !settings.notificationsEnabled) return;

        // Request browser notification permission
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Listen to the unread messages node for the current user
        const unreadRef = ref(db, `unread/${currentUser.uid}`);

        const unsubscribe = onValue(unreadRef, async (snapshot) => {
            if (!snapshot.exists()) {
                prevUnreadRef.current = {};
                return;
            }

            const currentUnread = snapshot.val();
            const prevUnread = prevUnreadRef.current;

            // Check each sender for new unread messages
            for (const senderId in currentUnread) {
                const currentCount = currentUnread[senderId];
                const prevCount = prevUnread[senderId] || 0;

                // If unread count increased and the app is in the background
                if (currentCount > prevCount && document.hidden) {
                    try {
                        // Fetch sender details to show in the notification
                        const senderSnap = await get(ref(db, `users/${senderId}`));
                        const senderName = senderSnap.exists() ? senderSnap.val().name : "New Message";
                        const senderImage = senderSnap.exists() ? (senderSnap.val().profile_image || "/profile_image.jpg") : "/logo192.png";

                        const notification = new Notification(senderName, {
                            body: settings.messagePreview ? `You have ${currentCount} unread message(s)` : "New message received",
                            icon: senderImage,
                            tag: senderId, // Group notifications by sender
                            renotify: true
                        });

                        notification.onclick = () => {
                            window.focus();
                            // Optional: Navigate to the chat with this sender
                            // This would require more integration with the routing/state
                            notification.close();
                        };

                        // Optional: Play sound if enabled (requires a notification sound file)
                        if (settings.soundEnabled) {
                            // Note: Modern browsers require interaction before playing audio
                            // but some notification sounds are handled by the OS.
                            // We attempt to play if we find a sound file in the future.
                        }
                    } catch (error) {
                        console.error("Error showing notification:", error);
                    }
                }
            }

            // Sync current state to prev for the next update
            prevUnreadRef.current = currentUnread;
        }, (error) => {
            console.error("Notification listener error:", error);
        });

        return () => unsubscribe();
    }, [currentUser, settings]);

    return null;
};

export default NotificationManager;
