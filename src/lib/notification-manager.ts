/**
 * Utility for handling Browser Native Notifications
 */

export const NotificationManager = {
    /**
     * Check if the browser supports notifications
     */
    isSupported(): boolean {
        return 'Notification' in window;
    },

    /**
     * Check current permission status
     */
    getPermission(): NotificationPermission {
        if (!this.isSupported()) return 'denied';
        return Notification.permission;
    },

    /**
     * Request permission from the user
     */
    async requestPermission(): Promise<NotificationPermission> {
        if (!this.isSupported()) return 'denied';
        try {
            const permission = await Notification.requestPermission();
            return permission;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return 'denied';
        }
    },

    /**
     * Send a notification
     */
    send(title: string, options?: NotificationOptions) {
        if (!this.isSupported()) return;

        // Only send if granted
        if (Notification.permission === 'granted') {
            try {
                const notification = new Notification(title, {
                    icon: '/pwa-192x192.png', // Default icon
                    badge: '/pwa-192x192.png', // Android badge
                    vibrate: [200, 100, 200], // Vibration pattern
                    requireInteraction: true, // Keep until user interacts
                    ...options
                } as any);

                // Focus window on click
                notification.onclick = function () {
                    window.focus();
                    notification.close();
                };

                return notification;
            } catch (e) {
                console.error('Error creating notification:', e);
            }
        }
    }
};
