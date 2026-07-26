const ADMIN_SESSION_COOKIE = "getdolar_admin_session";

export async function POST(request: Request) {
  return new Response(null, {
    headers: {
      location: new URL("/", request.url).toString(),
      "set-cookie": [
        `${ADMIN_SESSION_COOKIE}=`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=0",
      ].join("; "),
    },
    status: 303,
  });
}
