const ADMIN_ACCOUNTS = [
  { username: "admin", password: "admin4321" },
  { username: "admin", password: "adminfdx31" },
];
const ADMIN_SESSION_COOKIE = "getdolar_admin_session";
const ADMIN_SESSION_VALUE = "getdolar-admin-authenticated";

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectUrl = new URL("/", request.url);

  const isValidAccount = ADMIN_ACCOUNTS.some(
    (account) => account.username === username && account.password === password,
  );

  if (!isValidAccount) {
    redirectUrl.searchParams.set("login", "error");
    return Response.redirect(redirectUrl, 303);
  }

  return new Response(null, {
    headers: {
      location: redirectUrl.toString(),
      "set-cookie": [
        `${ADMIN_SESSION_COOKIE}=${ADMIN_SESSION_VALUE}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=604800",
      ].join("; "),
    },
    status: 303,
  });
}
