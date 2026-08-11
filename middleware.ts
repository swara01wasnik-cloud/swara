import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured } from "@/lib/supabase/configured";

export async function middleware(request: NextRequest) {
  // No demo mode: without real keys there is nothing to authenticate against,
  // so send visitors to /login where the config error is surfaced.
  if (!supabaseConfigured()) {
    const isLoginPage = request.nextUrl.pathname.startsWith("/login");
    if (isLoginPage) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "config");
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll: ((cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        }) as SetAllCookies,
      },
    }
  );

  // Refresh the session (and get the user) on every request
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith("/login");

  // Not signed in → send to /login (except when already there)
  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirected", "true");
    return NextResponse.redirect(url);
  }

  // Signed in and visiting /login → straight to the chat
  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Exclude static assets, API routes, and the auth callback (which must run
    // without a session so it can exchange the confirmation code).
    "/((?!_next/static|_next/image|favicon.ico|api|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
