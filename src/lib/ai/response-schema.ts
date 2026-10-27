import { z } from "zod";
import { proposalShape } from "@/lib/schemas/plan";

type ProviderSchema = {
  type: "object" | "array" | "string" | "integer" | "number" | "boolean";
  properties?: Record<string, ProviderSchema>;
  required?: string[];
  additionalProperties?: false;
  items?: ProviderSchema;
  enum?: (string | number)[];
  description?: string;
};

/** Keep constrained decoding small; Zod remains the authoritative validator. */
function providerShape(value: unknown): ProviderSchema {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid response schema node");
  const node = value as Record<string, unknown>;
  if (
    typeof node.type !== "string" ||
    !["object", "array", "string", "integer", "number", "boolean"].includes(
      node.type,
    ) ||
    "$ref" in node
  )
    throw new Error("Unsupported response schema type");

  const result: ProviderSchema = { type: node.type as ProviderSchema["type"] };
  const guidance: string[] = [];
  if (typeof node.description === "string") guidance.push(node.description);
  for (const [keyword, label] of [
    ["minLength", "Minimum characters"],
    ["maxLength", "Maximum characters"],
    ["minItems", "Minimum items"],
    ["maxItems", "Maximum items"],
    ["minimum", "Minimum value"],
    ["maximum", "Maximum value"],
  ]) {
    if (typeof node[keyword] === "number")
      guidance.push(`${label}: ${node[keyword]}.`);
  }
  if (typeof node.pattern === "string")
    guidance.push(`Use strings matching ${node.pattern}.`);
  if (guidance.length) result.description = guidance.join(" ");

  if (result.type === "object") {
    if (
      !node.properties ||
      typeof node.properties !== "object" ||
      Array.isArray(node.properties)
    )
      throw new Error("Missing response properties");
    result.properties = Object.fromEntries(
      Object.entries(node.properties).map(([name, schema]) => [
        name,
        providerShape(schema),
      ]),
    );
    if (Array.isArray(node.required))
      result.required = node.required.map(String);
    result.additionalProperties = false;
  }
  if (result.type === "array") result.items = providerShape(node.items);
  if (Array.isArray(node.enum)) result.enum = node.enum as (string | number)[];
  return result;
}

// Preserve every planning field and enum without forwarding grammar-expanding bounds,
// regexes or JSON Schema metadata. Guidance is advisory; proposalSchema checks all of it.
export const geminiResponseSchema = providerShape(
  z.toJSONSchema(proposalShape),
);
