const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");
const { DATAFINITI_API_KEY } = require("./configs/datafinitiConfig");
const { addressAbbreviations } = require("./configs/addressAbbreviations");
const { SYSTEM_AGES } = require("./configs/constants");

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Function to generate address variations
const generateAddressVariations = (address) => {
  const variations = [];

  // First try: abbreviated lowercase version
  let abbreviated = address.toLowerCase();
  Object.entries(addressAbbreviations).forEach(([full, abbr]) => {
    abbreviated = abbreviated.replace(new RegExp(`\\b${full}\\b`, "gi"), abbr);
  });
  variations.push(abbreviated);

  // Second try: non-abbreviated lowercase version
  variations.push(address.toLowerCase());

  return [...new Set(variations)]; // Remove duplicates
};

// Function to calculate HVAC installation year
const calculateHvacInstallationYear = (yearBuilt) => {
  const currentYear = new Date().getFullYear();
  const buildingAge = currentYear - yearBuilt;

  // If building is newer than HVAC average age, HVAC was installed when built
  if (buildingAge <= SYSTEM_AGES.HVAC) {
    return yearBuilt;
  }

  // Calculate the number of complete HVAC lifecycles since the building was built
  const completeCycles = Math.floor(buildingAge / SYSTEM_AGES.HVAC);

  // The last installation would have been after these complete cycles
  return yearBuilt + completeCycles * SYSTEM_AGES.HVAC;
};

// Function to try different address variations
const tryAddressVariations = async (variations, city, state, zip) => {
  // Append * to zip code
  const formattedZip = `${zip}*`;

  for (const addressVariation of variations) {
    const query = {
      query: `address:("${addressVariation}") AND city:("${city}") AND province:("${state}") AND postalCode:(${formattedZip})`,
    };

    logger.info("Trying Datafiniti query variation:", query);

    try {
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
        const errorText = await response.text();
        logger.error("Datafiniti API error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        continue;
      }

      const data = await response.json();
      if (data.records && data.records.length > 0) {
        logger.info(
          "Found matching property with address variation:",
          addressVariation
        );
        return data;
      }
    } catch (error) {
      logger.error("Error with address variation:", {
        addressVariation,
        error: error.message,
      });
    }
  }
  return null;
};

const getPropertyData = onRequest(async (req, res) => {
  try {
    const { propertyId, address, city, state, zip } = req.body;

    logger.info("Received request with parameters:", {
      propertyId,
      address,
      city,
      state,
      zip,
    });

    if (!propertyId || !address || !city || !state || !zip) {
      logger.error("Missing required parameters");
      await db.collection("properties").doc(propertyId).update({
        datafinitiFetchedAt: new Date().toISOString(),
        datafinitiError: "Missing required parameters",
      });
      return res.status(400).json({
        error:
          "Missing required parameters: propertyId, address, city, state, or zip",
      });
    }

    // Generate address variations and try each one
    const addressVariations = generateAddressVariations(address);
    logger.info("Generated address variations:", addressVariations);

    const data = await tryAddressVariations(
      addressVariations,
      city,
      state,
      zip
    );

    if (!data) {
      logger.warn("No property data found for any address variation");
      await db.collection("properties").doc(propertyId).update({
        datafinitiFetchedAt: new Date().toISOString(),
        datafinitiError: "No property data found for any address variation",
      });
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

    // Calculate HVAC installation year if year built is available
    const yearBuilt = property.yearBuilt;
    const hvacInstalled = yearBuilt
      ? calculateHvacInstallationYear(parseInt(yearBuilt))
      : null;

    const propertyDetails = {
      propertyData: {
        address: property.address || null,
        city: property.city || null,
        state: property.province || null,
        postalCode: property.postalCode || null,
        latitude: parseFloat(property.latitude) || null,
        longitude: parseFloat(property.longitude) || null,
        yearBuilt: yearBuilt || null,
        hvacInstalled,
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
        garageSpaces:
          parseInt(getFeatureValue("Garage Parking Spaces")) || null,
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
      },
      neighborhoodData: {
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
      },
      riskData: {
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
      },
      datafinitiFetchedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    logger.info("Updating Firestore with property details");

    // Update the Firestore document
    await db.collection("properties").doc(propertyId).update(propertyDetails);

    logger.info("Successfully updated property data");

    return res.status(200).json({
      message: "Property data updated successfully",
      propertyId,
    });
  } catch (error) {
    logger.error("Error processing property data:", error);
    await db.collection("properties").doc(propertyId).update({
      datafinitiFetchedAt: new Date().toISOString(),
      datafinitiError: error.message,
    });
    return res.status(500).json({
      error: "Failed to process property data",
      details: error.message,
    });
  }
});

module.exports = {
  getPropertyData,
};
