import { NextResponse, type NextRequest } from "next/server";
import { homeFor, pageRule } from "@/lib/auth/roles";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Optimistic page protection: signed-out staff go to /login, wrong roles go home,
 * doctors stay in their own department. APIs enforce permissions themselves.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const rule = pageRule(pathname);
  if (!rule) return NextResponse.next();

  const user = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  if (!rule.roles.includes(user.role)) {
    const home = new URL(homeFor(user), request.url);
    home.searchParams.set("denied", pathname);
    return NextResponse.redirect(home);
  }
  if (user.role === "doctor" && pathname.startsWith("/doctor")) {
    const own = `/doctor/${user.dept}`;
    if (pathname !== own) return NextResponse.redirect(new URL(own + search, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/nurse/:path*", "/doctor/:path*", "/records/:path*", "/patients/:path*", "/surveillance/:path*", "/validation/:path*", "/p/:path*"],
};
