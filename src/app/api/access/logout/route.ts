import { accessHandler } from "@/lib/server/hosted/access";
import { hostedSecurity } from "@/lib/server/hosted/runtime";
export const runtime = "nodejs";
export const POST = accessHandler(hostedSecurity, "logout");
