import { onRequest } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";

const DATAFINITI_API_KEY = defineString(
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmcXRqOWdyeHY3ajduYmtoMjU2eHcxbWgwOGVtcnJ2ZiIsImlzcyI6ImRhdGFmaW5pdGkuY28ifQ.AuU3Kpbv3zMGBuTBh9ADMAFclzeDmYbFSOGHJpv60hENctYmbYoIN_NsuvMIYUc2YEG0vNKzlKRwi4lxdq-onnAfLdmcYFyIyWK-N-7k54QNsbNgBvxTFp1kAdYbf5GRfDWAnjLzLcnqJG3T5Z-1QV5ddrEOQSpRDS3CQ92racd6MCCZofHa4OR8ajh2eqRSQZckk41iTeeP3-ZjvvSiDx1VKbuI5Z80qOLJJDn8cOjo97c4UQn8R7wehYFKW1C2Dn1Sh_zU1OxGa95-T6pt8lgOYBJNSTaiqwFA1Fk9BYuXrZBs08-506V5pyjh4xnBHXxHF6z7HIczjCGfEkvMttiuQn6_1pzhDAi0IT84nxCYFnTEM20Paku5e3-M6Ou60Iwv2SC4yiAtHI4ONo35Hm-tQzIWg1_HNdWuMr64fZBlj0fOfSFIPozXuThWTgvwx48xNuYLG_SyqNnoP7sSmT1oxjpNWJbCv96_ybzU1djTlyK0Iy0eGAAsXMYhq_48lYLKEqL_5EsXT57wqnZXpJsNsnv_6Q3jFEr31m5jVqB1u6DKGoem7mnvmBsXy6u-tGtJnbpwS6KskZrW_h9ykRtZKxreiwx5YXutpFhfRuF3wn19csYRVTscvjm1eV13JncUAcCbo2eO89czJ1ucPQ1GfXzMxl7aUglFJaC8-ss"
);

export const getPropertyData = onRequest(async (req, res) => {
  try {
    const { address, city, state, zip } = req.body;

    if (!address || !city || !state || !zip) {
      return res.status(400).json({
        error: "Missing required parameters: address, city, state, or zip",
      });
    }

    const query = {
      query: `address:"${address}" AND city:"${city}" AND state:"${state}" AND postalCode:"${zip}"`,
      format: "JSON",
      num_records: 1,
      download: false,
    };

    const response = await fetch(
      "https://api.datafiniti.co/v4/properties/search",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DATAFINITI_API_KEY.value()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(query),
      }
    );

    if (!response.ok) {
      throw new Error(`Datafiniti API errors: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return res.status(404).json({
        error: "No property data found",
      });
    }

    // Extract relevant property data
    const property = data.records[0];
    const propertyData = {
      yearBuilt: property.yearBuilt || null,
      squareFootage: property.squareFootage || null,
      bedrooms: property.bedrooms || null,
      bathrooms: property.bathrooms || null,
      lotSize: property.lotSize || null,
      propertyType: property.propertyType || null,
      lastSaleDate: property.lastSaleDate || null,
      lastSalePrice: property.lastSalePrice || null,
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
