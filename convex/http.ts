import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/ingest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (typeof body.source !== "string" || typeof body.type !== "string") {
      return Response.json(
        { error: "Payload must include source and type" },
        { status: 400 },
      );
    }

    const eventId = await ctx.runMutation(api.events.record, {
      source: body.source,
      type: body.type,
      timestamp:
        typeof body.timestamp === "number" ? body.timestamp : undefined,
      payload: body.payload ?? body,
      idempotencyKey:
        typeof body.idempotencyKey === "string"
          ? body.idempotencyKey
          : undefined,
    });

    return Response.json({ ok: true, eventId });
  }),
});

export default http;
