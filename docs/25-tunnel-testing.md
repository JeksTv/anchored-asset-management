# Temporary tunnel testing

Set APP_ORIGIN in the local .env to the exact HTTPS tunnel URL, without a trailing slash. Restart the development server after changing it. Vite loads APP_ORIGIN and allows only its hostname in addition to default local hosts. The authentication origin check uses the same origin; use the tunnel URL to sign in and save changes during this session.

When a Quick Tunnel changes address, update APP_ORIGIN and restart the app. To return to local-only testing, restore APP_ORIGIN=http://localhost:3000 and restart. Do not set allowedHosts to true or allow all trycloudflare.com subdomains. Keep .env out of source control. A development tunnel exposes the running local app; stop the tunnel after testing. It is not a production deployment.
