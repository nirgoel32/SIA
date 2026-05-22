import type { NextApiRequest, NextApiResponse } from "next";
import {
  getForeignBornPopulation,
  getPopulationByAncestry,
  getStateDemographics,
  getCounterfactualProjection,
} from "@/services/census";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const country = req.query.country as string | undefined;
  const type = (req.query.type as string) ?? "ancestry";

  try {
    if (type === "foreignBorn") {
      const data = await getForeignBornPopulation();
      return res.status(200).json({ data, source: "census" });
    }
    if (type === "state") {
      const state = (req.query.state as string) ?? "California";
      const data = await getStateDemographics(state);
      return res.status(200).json({ data, source: "census-fallback" });
    }
    if (type === "counterfactual") {
      const actual = await getPopulationByAncestry(country);
      const projected = getCounterfactualProjection(country);
      return res.status(200).json({
        actual,
        projected,
        disclaimer:
          "Educational simulation modeling reduced post-1965 immigration flows. Not a political forecast.",
        source: "model",
      });
    }

    const data = await getPopulationByAncestry(country);
    return res.status(200).json({ data, source: "census-fallback" });
  } catch (e) {
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Census fetch failed",
    });
  }
}
