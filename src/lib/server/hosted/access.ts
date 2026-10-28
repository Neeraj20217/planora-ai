import { z } from "zod";
import { readBody } from "../handler";
import { PlanningError } from "../errors";
import type { HostedSecurity } from "./security";

export function accessHandler(
  getSecurity: () => HostedSecurity,
  action: "redeem" | "logout",
) {
  return async (request: Request) => {
    const headers: Record<string, string> = {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
    try {
      const security = getSecurity();
      security.boundary(request);
      if (
        !/^application\/json(?:\s*;|$)/i.test(
          request.headers.get("content-type") ?? "",
        )
      )
        throw new PlanningError(
          415,
          "CONTENT_TYPE",
          "Send JSON access details.",
        );
      const schema =
        action === "redeem"
          ? z.object({ code: z.string().max(256) }).strict()
          : z.object({}).strict();
      const parsed = schema.safeParse(await readBody(request));
      if (!parsed.success)
        throw new PlanningError(400, "INVALID_INPUT", "Check the access form.");
      headers["Set-Cookie"] =
        action === "redeem"
          ? await security.redeem(
              request,
              z
                .object({ code: z.string().max(256) })
                .strict()
                .parse(parsed.data).code,
            )
          : await security.logout(request);
      return Response.json({ ok: true }, { headers });
    } catch (error) {
      const safe =
        error instanceof PlanningError
          ? error
          : new PlanningError(
              503,
              "ACCESS_UNAVAILABLE",
              "Secure access is unavailable. Please try later.",
            );
      if (safe.retryAfter) headers["Retry-After"] = String(safe.retryAfter);
      return Response.json(
        { error: { code: safe.code, message: safe.message } },
        { status: safe.status, headers },
      );
    }
  };
}
