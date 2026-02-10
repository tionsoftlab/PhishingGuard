import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientLayout from "./ClientLayout";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/SessionProvider";

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
};

export const metadata: Metadata = {
    metadataBase: new URL(
        process.env.NEXTAUTH_URL || "https://cslab.kku.ac.kr:3000",
    ),
    title: {
        default: "피싱가드",
        template: "%s | 피싱가드",
    },
    description:
        "피싱가드 by 보안방범대 - URL, 문자, 이메일, QR 코드, 보이스피싱 통합 보안 검사 및 피싱 탐지 서비스",
    keywords: [
        "피싱",
        "보안",
        "피싱 탐지",
        "보안 검사",
        "URL 검사",
        "문자 검사",
        "이메일 검사",
        "QR 코드",
        "보이스피싱",
        "보안방범대",
    ],
    authors: [{ name: "보안방범대" }],
    creator: "보안방범대",
    publisher: "보안방범대",
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    icons: {
        icon: "/logo.png",
        shortcut: "/logo.png",
        apple: "/logo.png",
    },
    openGraph: {
        title: "피싱가드",
        description:
            "피싱가드 by 보안방범대 - URL, 문자, 이메일, QR 코드, 보이스피싱 통합 보안 검사 및 피싱 탐지 서비스",
        type: "website",
        locale: "ko_KR",
        siteName: "피싱가드",
        images: [
            {
                url: "/logo.png",
                width: 1200,
                height: 630,
                alt: "피싱가드 로고",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "피싱가드",
        description:
            "피싱가드 by 보안방범대 - URL, 문자, 이메일, QR 코드, 보이스피싱 통합 보안 검사 및 피싱 탐지 서비스",
        images: ["/logo.png"],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <body suppressHydrationWarning>
                <SessionProvider>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="light"
                        enableSystem={false}
                    >
                        <ClientLayout>{children}</ClientLayout>
                    </ThemeProvider>
                </SessionProvider>
            </body>
        </html>
    );
}
