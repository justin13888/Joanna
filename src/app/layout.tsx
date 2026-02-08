import "@/styles/globals.css";

import type { Metadata, Viewport } from "next";
import { Geist, Patrick_Hand } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";
import { PersonaProvider } from "@/app/_components/persona-context";

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
	variable: "--font-patrick",
	weight: "400",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html className={`${geist.variable} ${patrickHand.variable}`} lang="en">
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `
							try {
								const stored = localStorage.getItem("persona-preference");
								if (stored === "joe") {
									document.documentElement.classList.add("theme-joe");
								}
							} catch (e) {}
						`,
					}}
				/>
			</head>
			<body className="min-h-dvh antialiased">
				<TRPCReactProvider>
					<PersonaProvider>{children}</PersonaProvider>
				</TRPCReactProvider>
			</body>
		</html>
	);
}
