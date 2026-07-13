import { z } from "zod";
export const stormSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    season: z.number().int(),
    basin: z.enum(["NA", "EP", "WP", "NI", "SI", "SP", "SA"]),
    firstTime: z.iso.datetime(),
    lastTime: z.iso.datetime(),
    trackAsset: z.string(),
    previewTrack: z
      .array(
        z.tuple([
          z.number().int(),
          z.number(),
          z.number(),
          z.number().nullable(),
          z.number().nullable(),
        ]),
      )
      .min(1),
    imagery: z
      .object({
        status: z.enum([
          "processed",
          "located-not-processed",
          "not-located",
          "uncertain",
          "outside-current-collection",
        ]),
      })
      .passthrough(),
    provenance: z.object({ trackSource: z.string() }).passthrough(),
  })
  .passthrough();
export const manifestSchema = z
  .object({
    version: z.string(),
    generatedAt: z.iso.datetime(),
    totalStorms: z.number().int().min(4900),
    basinCounts: z.record(z.string(), z.number().int()),
    storms: z.array(stormSchema).min(1),
  })
  .passthrough();
