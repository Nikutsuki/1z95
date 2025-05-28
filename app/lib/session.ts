import { createCookieSessionStorage, Session } from "@remix-run/node";

const sessionSecret = process.env.SESSION_SECRET || "default-secret-change-in-production";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
    sameSite: "lax",
    secrets: [sessionSecret],
    secure: process.env.NODE_ENV === "production",
  },
});

export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

export async function commitSession(session: Session) {
  return sessionStorage.commitSession(session);
}

export async function destroySession(session: Session) {
  return sessionStorage.destroySession(session);
}

export async function requireAuth(request: Request) {
  const session = await getSession(request);
  const isAuthenticated = session.get("isAuthenticated");
  
  if (!isAuthenticated) {
    return null;
  }
  
  return session;
}

export async function createAuthSession(request: Request) {
  const session = await getSession(request);
  session.set("isAuthenticated", true);
  session.set("loginTime", Date.now());
  
  return session;
}