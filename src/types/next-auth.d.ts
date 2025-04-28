import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: number;
    username: string;
    organizationId?: number;
    organizationName?: string;
    userType: number;
    roles: string[];
    permissions: string[];
  }

  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: number;
    username: string;
    organizationId?: number;
    organizationName?: string;
    userType: number;
    roles: string[];
    permissions: string[];
  }
}
