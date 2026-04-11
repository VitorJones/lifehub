import type { NextAuthConfig } from "next-auth";

const PUBLIC_PATHS = ["/login", "/registro", "/api/auth", "/api/registro"];

export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublic = PUBLIC_PATHS.some((p) => nextUrl.pathname.startsWith(p));

      if (isPublic) {
        // Redireciona usuário já autenticado que tenta acessar login/registro
        if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/registro")) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
  },
};
