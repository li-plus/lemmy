import { RawPair } from "./types";
import { SharedConversationProcessor } from "./shared-conversation-processor";

// Reused across calls; the processor is stateless.
const processor = new SharedConversationProcessor();

/**
 * Strip the verbose streaming payloads (`events` array and raw SSE `body_raw`)
 * from a logged pair, keeping only the reconstructed final `body` message that
 * the conversation view needs to render. This is what `--no-events` produces.
 *
 * The streaming payloads are redundant: the conversation view reconstructs the
 * assistant message from `body` (or, failing that, `body_raw`), and `events` is
 * only consumed by the raw-calls debug view. Dropping them shrinks both the
 * JSONL log and the embedded HTML data dramatically for token-heavy sessions.
 */
export function stripEvents(pair: RawPair): RawPair {
	const resp = pair.response;
	if (!resp) return pair;

	// Already have a structured body: just drop the redundant stream payloads.
	if (resp.body !== undefined) {
		if (resp.events === undefined && resp.body_raw === undefined) return pair;
		const { events: _events, body_raw: _bodyRaw, ...rest } = resp;
		return { ...pair, response: rest };
	}

	// Only the raw SSE stream is available: reconstruct the message so the pair
	// still renders, then drop the raw stream and events.
	if (resp.body_raw !== undefined) {
		try {
			const message = processor.parseStreamingResponse(resp.body_raw);
			const { events: _events, body_raw: _bodyRaw, ...rest } = resp;
			return { ...pair, response: { ...rest, body: message } };
		} catch {
			// Can't reconstruct — keep body_raw (it's the only content), but still
			// drop the even-larger events array if present.
			if (resp.events === undefined) return pair;
			const { events: _events, ...rest } = resp;
			return { ...pair, response: rest };
		}
	}

	// No body and no raw stream; only events could be present.
	if (resp.events === undefined) return pair;
	const { events: _events, ...rest } = resp;
	return { ...pair, response: rest };
}
