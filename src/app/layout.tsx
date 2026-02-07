import "@/styles/globals.css";

import type { Metadata, Viewport } from "next";
import { Geist, Patrick_Hand } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";

export const metadata: Metadata = {
	title: "Joanna",
	description: "Your personal AI journaling assistant",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	viewportFit: "cover",
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

const patrickHand = Patrick_Hand({
	subsets: ["latin"],
	variable: "--font-patrick-hand",
	weight: "400",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html className={`${geist.variable} ${patrickHand.variable}`} lang="en">
			<body className="flex min-h-dvh items-center justify-center bg-neutral-900 text-stone-800 antialiased">
				<TRPCReactProvider>{children}</TRPCReactProvider>
			</body>
		</html>
	);
}
