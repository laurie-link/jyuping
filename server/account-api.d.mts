import type { IncomingMessage, ServerResponse } from "node:http"

export function handleAccountApi(request: IncomingMessage, response: ServerResponse): Promise<boolean>
