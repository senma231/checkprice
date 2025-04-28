import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // 临时登录方案：如果用户名是 admin 且密码是 admin123，直接允许登录
          if (credentials.username === 'admin' && credentials.password === 'admin123') {
            console.log('使用临时登录方案');

            // 返回临时管理员用户
            return {
              id: 1,
              name: '系统管理员',
              email: 'admin@example.com',
              username: 'admin',
              organizationId: null,
              organizationName: null,
              userType: 1,
              roles: ['超级管理员'],
              permissions: [
                'user:view', 'user:create', 'user:edit', 'user:delete',
                'role:view', 'role:create', 'role:edit', 'role:delete', 'permission:assign',
                'org:view', 'org:create', 'org:edit', 'org:delete',
                'service-type:view', 'service-type:create', 'service-type:edit', 'service-type:delete',
                'service:view', 'service:create', 'service:edit', 'service:delete',
                'price:view', 'price:create', 'price:edit', 'price:delete', 'price:import', 'price:export',
                'config:view', 'config:edit', 'log:view', 'data:analysis',
                'announcement:view', 'announcement:create', 'announcement:edit', 'announcement:delete'
              ]
            };
          }

          // 正常登录流程
          const user = await prisma.user.findUnique({
            where: { username: credentials.username },
            include: {
              organization: true,
              userRoles: {
                include: {
                  role: {
                    include: {
                      rolePermissions: {
                        include: {
                          permission: true
                        }
                      }
                    }
                  }
                }
              }
            }
          });

          if (!user) {
            return null;
          }

          // 验证密码
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          if (!isPasswordValid) {
            return null;
          }

          // 更新最后登录时间
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginTime: new Date() }
          });

          // 提取角色和权限
          const roles = user.userRoles.map(ur => ur.role.name);
          const permissions = user.userRoles.flatMap(ur =>
            ur.role.rolePermissions.map(rp => rp.permission.code)
          );

          // 返回用户信息
          return {
            id: user.id,
            name: user.realName || user.username,
            email: user.email,
            username: user.username,
            organizationId: user.organizationId,
            organizationName: user.organization?.name,
            userType: user.userType,
            roles,
            permissions
          };
        } catch (error) {
          console.error("认证错误:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.userType = user.userType;
        token.roles = user.roles;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.organizationId = token.organizationId;
        session.user.organizationName = token.organizationName;
        session.user.userType = token.userType;
        session.user.roles = token.roles;
        session.user.permissions = token.permissions;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24小时
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
