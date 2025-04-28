import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextAuthProvider } from "@/providers/NextAuthProvider";
import { AntdProvider } from "@/providers/AntdProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import { NotificationProvider } from "@/components/GlobalNotification";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "物流查价系统",
  description: "PGS物流查价系统 - 提供便捷的物流价格查询服务",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <AntdProvider>
            <NextAuthProvider>
              <NotificationProvider>
                {children}
              </NotificationProvider>
            </NextAuthProvider>
          </AntdProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
