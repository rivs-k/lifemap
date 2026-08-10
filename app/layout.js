import "./globals.css";
import { Oswald } from "next/font/google";
import AnimatedBackground from "./components/AnimatedBackground";
import FondDunes from "./components/FondDunes";
import Navbar from "./components/Navbar";
import { LangueProvider } from "./components/LangueProvider";

const oswald = Oswald({
    subsets: ["latin"],
    weight: ["500", "700"],
    variable: "--font-oswald",
});

export const metadata = {
    title: "LifeMap",
    description: "Atteignez vos objectifs avec LifeMap",
};

export default function RootLayout({ children }) {
    return (
        <html lang="fr" className={oswald.variable}>
            <body className="relative bg-black text-white">
                <FondDunes />
                <div className="fixed inset-0 bg-black/40" />
                <AnimatedBackground />
                <LangueProvider>
                    <Navbar />
                    <div className="relative z-10">{children}</div>
                </LangueProvider>
            </body>
        </html>
    );
}