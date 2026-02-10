"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useSecurityHelmet() {
    const router = useRouter();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                (e.metaKey && e.altKey && e.keyCode === 73) ||
                (e.metaKey && e.altKey && e.keyCode === 74) ||
                (e.metaKey && e.altKey && e.keyCode === 67) ||
                (e.metaKey && e.shiftKey && e.keyCode === 67) ||
                (e.ctrlKey && e.shiftKey && e.keyCode === 73) ||
                (e.ctrlKey && e.shiftKey && e.keyCode === 74) ||
                (e.ctrlKey && e.shiftKey && e.keyCode === 67) ||
                e.keyCode === 123 ||
                (e.metaKey && e.altKey && e.keyCode === 85) ||
                (e.ctrlKey && e.keyCode === 85)
            ) {
                e.preventDefault();
                return false;}
        };

        const handleKeyDown2 = (e: KeyboardEvent) => {
            if (
                e.ctrlKey &&
                (e.key === "c" || e.key === "x" || e.key === "v")
            ) {
                e.preventDefault();
                return false;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keydown", handleKeyDown2);

        const preventAction = (e: Event) => {
            e.preventDefault();
            return false;
        };

        document.body.style.userSelect = "none";
        (document.body.style as any).msUserSelect = "none";
        (document.body.style as any).mozUserSelect = "none";

        document.addEventListener("contextmenu", preventAction);
        document.addEventListener("selectstart", preventAction);
        document.addEventListener("dragstart", preventAction);
        document.addEventListener("copy", preventAction);
        document.addEventListener("cut", preventAction);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keydown", handleKeyDown2);
            document.removeEventListener("contextmenu", preventAction);
            document.removeEventListener("selectstart", preventAction);
            document.removeEventListener("dragstart", preventAction);
            document.removeEventListener("copy", preventAction);
            document.removeEventListener("cut", preventAction);

            document.body.style.userSelect = "";
            (document.body.style as any).msUserSelect = "";
            (document.body.style as any).mozUserSelect = "";
        };
    }, [router]);
}

export function SecurityHelmet() {
    useSecurityHelmet();
    return null;
}
