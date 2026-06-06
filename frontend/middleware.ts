import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/pr",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    // Match app routes while excluding Next internals and static assets.
    "/((?!_next|.*\\..*).*)",
    "/",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

