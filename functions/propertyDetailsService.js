import { onRequest } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";

const DATAFINITI_API_KEY =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmcXRqOWdyeHY3ajduYmtoMjU2eHcxbWgwOGVtcnJ2ZiIsImlzcyI6ImRhdGFmaW5pdGkuY28ifQ.AuU3Kpbv3zMGBuTBh9ADMAFclzeDmYbFSOGHJpv60hENctYmbYoIN_NsuvMIYUc2YEG0vNKzlKRwi4lxdq-onnAfLdmcYFyIyWK-N-7k54QNsbNgBvxTFp1kAdYbf5GRfDWAnjLzLcnqJG3T5Z-1QV5ddrEOQSpRDS3CQ92racd6MCCZofHa4OR8ajh2eqRSQZckk41iTeeP3-ZjvvSiDx1VKbuI5Z80qOLJJDn8cOjo97c4UQn8R7wehYFKW1C2Dn1Sh_zU1OxGa95-T6pt8lgOYBJNSTaiqwFA1Fk9BYuXrZBs08-506V5pyjh4xnBHXxHF6z7HIczjCGfEkvMttiuQn6_1pzhDAi0IT84nxCYFnTEM20Paku5e3-M6Ou60Iwv2SC4yiAtHI4ONo35Hm-tQzIWg1_HNdWuMr64fZBlj0fOfSFIPozXuThWTgvwx48xNuYLG_SyqNnoP7sSmT1oxjpNWJbCv96_ybzU1djTlyK0Iy0eGAAsXMYhq_48lYLKEqL_5EsXT57wqnZXpJsNsnv_6Q3jFEr31m5jVqB1u6DKGoem7mnvmBsXy6u-tGtJnbpwS6KskZrW_h9ykRtZKxreiwx5YXutpFhfRuF3wn19csYRVTscvjm1eV13JncUAcCbo2eO89czJ1ucPQ1GfXzMxl7aUglFJaC8-ss";

export const getPropertyData = onRequest(async (req, res) => {
  try {
    const { address, city, state, zip } = req.body;

    if (!address || !city || !state || !zip) {
      return res.status(400).json({
        error: "Missing required parameters: address, city, state, or zip",
      });
    }

    const query = {
      query: `address:("${address}") AND city:("${city}") AND province:("${state}") AND postalCode:(${zip})`,
    };

    const response = await fetch(
      "https://api.datafiniti.co/v4/properties/search",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DATAFINITI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(query),
      }
    );

    if (!response.ok) {
      throw new Error(`Datafiniti API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return res.status(404).json({
        error: "No property data found",
      });
    }

    // Extract relevant property data
    const property = data.records[0];

    // Find the most recent assessed values
    const assessedValues = property.assessedValues?.[0] || {};

    // Extract features
    const features = property.features || [];
    const getFeatureValue = (key) => {
      const feature = features.find((f) => f.key === key);
      return feature ? feature.value[0] : null;
    };

    // Extract HVAC information
    const hvacTypes = property.hvacTypes || [];
    const cooling = hvacTypes.find((type) => type.includes("Central")) || null;
    const heating =
      hvacTypes.find((type) => type.includes("Forced Air")) || null;

    // Extract pool information
    const poolFeatures = features.filter((f) => f.key === "Pool Information");
    const poolType =
      poolFeatures.length > 0 ? poolFeatures[0].value.join(", ") : null;

    // Improved pool detection logic
    const hasPool = Boolean(
      property.features?.some(
        (f) =>
          (f.key === "Pool" && f.value.includes("Yes")) ||
          (f.key === "Pool Information" && f.value.length > 0)
      ) ||
        property.exteriorFeatures?.some((f) => f.toLowerCase().includes("pool"))
    );

    const propertyData = {
      address: property.address || null,
      city: property.city || null,
      state: property.province || null,
      postalCode: property.postalCode || null,
      latitude: parseFloat(property.latitude) || null,
      longitude: parseFloat(property.longitude) || null,
      yearBuilt: property.yearBuilt || null,
      floorSizeSqFt: property.floorSizeValue || null,
      lotSizeSqFt: property.lotSizeValue || null,
      numFloors: property.numFloor || null,
      numBedrooms: property.numBedroom || null,
      numBathrooms: property.numBathroom || null,
      cooling: cooling || null,
      heating: heating || null,
      hasPool,
      poolType: poolType,
      construction:
        property.exteriorFeatures
          ?.find((f) => f.includes("Construction:"))
          ?.replace("Construction: ", "") || null,
      roofType: property.roofing?.[0] || null,
      windows: "Unknown",
      appliances: property.appliances || [],
      assessedValue: assessedValues.totalAmount || null,
      assessedLandValue: assessedValues.landAmount || null,
      assessedImprovementValue: assessedValues.improvementsAmount || null,
      estimatedHomeValue: property.mostRecentEstimatedPriceAmount || null,
      estimatedRent:
        getFeatureValue("Redfin Rental Estimate")?.replace(" / month", "") ||
        null,
      hoaFee: property.fees?.[0]?.amountMax || null,
      solarInstalled: Boolean(
        property.features?.some((f) => f.value?.includes("Solar"))
      ),
      garageSpaces: parseInt(getFeatureValue("Garage Parking Spaces")) || null,
      nonGarageSpaces:
        parseInt(getFeatureValue("Non-Garage Parking Spaces")) || null,
      totalParkingSpaces: property.numParkingSpaces || null,
      propertyUse: property.propertyType || null,
      zoning: property.zoning || null,
      hasFireplace: Boolean(
        property.features?.some(
          (f) => f.key === "Fireplace" && f.value.includes("Yes")
        )
      ),
      hasLaundry: Boolean(
        property.features?.some(
          (f) => f.key === "Laundry" && !f.value.includes("None")
        )
      ),
      hasAirConditioning: Boolean(cooling),
      hasHeating: Boolean(heating),
      neighborhood: property.neighborhoods?.[0] || null,
      county: property.county || null,
      jobMarketWhiteCollarPercent:
        parseFloat(getFeatureValue("Graduate Degree Percentile")) || null,
      unemploymentRate:
        parseFloat(getFeatureValue("Unemployment Rate")?.replace("%", "")) ||
        null,
      medianIncome:
        parseInt(
          getFeatureValue("Median Family Income")
            ?.replace("$", "")
            .replace(",", "")
        ) || null,
      householdsWithChildrenPercent:
        parseFloat(
          getFeatureValue("Households with Children")?.replace("%", "")
        ) || null,
      medianHomeownerAge:
        parseFloat(getFeatureValue("Median Homeowner Age")) || null,
      floodRisk:
        property.features
          ?.find((f) => f.value?.includes("flood risk"))
          ?.value[0]?.match(/low|medium|high/i)?.[0]
          ?.toLowerCase() || null,
      earthquakeRisk:
        property.features
          ?.find((f) => f.value?.includes("earthquake risk"))
          ?.value[0]?.match(/low|medium|high/i)?.[0]
          ?.toLowerCase() || null,
      tornadoRisk:
        property.features
          ?.find((f) => f.value?.includes("tornado risk"))
          ?.value[0]?.match(/low|medium|high/i)?.[0]
          ?.toLowerCase() || null,
    };

    return res.status(200).json(propertyData);
  } catch (error) {
    console.error("Error fetching property data:", error);
    return res.status(500).json({
      error: "Failed to fetch property data",
      details: error.message,
    });
  }
});
