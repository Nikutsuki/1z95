# 1z95 Game Admin Panel

A real-time game management dashboard built with Remix, featuring live player tracking and secure admin authentication.

- 📖 [Remix docs](https://remix.run/docs)

## Features

- **Live Game Dashboard**: Real-time player status tracking with SSE
- **Secure Admin Panel**: Password-protected admin interface
- **Player Management**: Edit player stats, points, health, and status
- **Game Settings**: Update game title and reset all players
- **Modern UI**: Responsive design with Tailwind CSS

## Setup

1. Install dependencies:
```shellscript
npm install
```

2. Configure environment variables:
```shellscript
cp .env.example .env
```

Edit `.env` and set your admin password:
```
ADMIN_PASSWORD=your-secure-admin-password
SESSION_SECRET=your-super-secret-session-key
```

## Development

Run the dev server:

```shellscript
npm run dev
```

## Admin Access

- Navigate to `/admin` to access the admin panel
- Use the password you set in the `ADMIN_PASSWORD` environment variable
- Sessions last 24 hours before requiring re-authentication
- Click "Logout" to end your session early

## Security

- **Environment Variables**: Never commit your `.env` file to version control
- **Admin Password**: Use a strong password in production
- **Session Secret**: Generate a cryptographically secure session secret for production
- **HTTPS**: Always use HTTPS in production for secure authentication

## Routes

- `/` - Live game dashboard (public)
- `/admin` - Password-protected admin panel
- `/api/events` - SSE endpoint for real-time updates

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

**Important for Production:**
- Set `NODE_ENV=production`
- Use strong values for `ADMIN_PASSWORD` and `SESSION_SECRET`
- Ensure your hosting platform supports environment variables

### DIY

If you're familiar with deploying Node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `npm run build`

- `build/server`
- `build/client`

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever css framework you prefer. See the [Vite docs on css](https://vitejs.dev/guide/features.html#css) for more information.
