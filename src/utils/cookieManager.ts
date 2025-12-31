/**
 * Cookie Manager utility for One SMS
 * Used for storing light preferences and tracking data efficiently.
 */

interface CookieOptions {
    days?: number;
    path?: string;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
}

export const CookieManager = {
    /**
     * Set a cookie
     */
    set: (name: string, value: string, options: CookieOptions = {}) => {
        const {
            days = 365,
            path = '/',
            secure = true,
            sameSite = 'Lax'
        } = options;

        const d = new Date();
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "expires=" + d.toUTCString();

        document.cookie = `${name}=${value};${expires};path=${path};SameSite=${sameSite}${secure ? ';Secure' : ''}`;
    },

    /**
     * Get a cookie by name
     */
    get: (name: string): string | null => {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    },

    /**
     * Remove a cookie
     */
    remove: (name: string, path: string = '/') => {
        document.cookie = `${name}=; Max-Age=-99999999; path=${path}`;
    }
};
