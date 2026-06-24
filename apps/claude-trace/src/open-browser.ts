import { spawn } from "child_process";

/**
 * Open a file in the default browser without crashing if the launcher binary
 * is missing. `spawn` reports a missing executable via an async "error" event
 * (not a thrown exception), so we must attach an error listener instead of
 * relying on try/catch.
 */
export function openInBrowser(
	filePath: string,
	onMessage: (message: string) => void = console.log,
	onError: (message: string) => void = console.error,
): void {
	try {
		const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
		const child = spawn(cmd, [filePath], { detached: true, stdio: "ignore" });
		child.on("error", (err: Error) => {
			onError(`Failed to open browser: ${err.message}`);
		});
		child.unref();
		onMessage(`Opening ${filePath} in browser`);
	} catch (err) {
		onError(`Failed to open browser: ${err}`);
	}
}
