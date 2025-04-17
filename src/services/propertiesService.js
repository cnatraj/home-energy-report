import { db } from "../firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { logAnalyticsEvent } from "../firebase";

export const createProperty = async (addressDetails) => {
  try {
    // Create initial property document with Google Maps data
    const docRef = await addDoc(collection(db, "properties"), {
      mapsData: {
        ...addressDetails,
        createdAt: new Date().toISOString(),
      },
    });

    logAnalyticsEvent("generate_report", {
      address: addressDetails.address,
      city: addressDetails.city,
      state: addressDetails.state,
      zip: addressDetails.zip,
    });

    return docRef.id;
  } catch (error) {
    console.error("Error adding document: ", error);
    logAnalyticsEvent("error", {
      error_type: "document_creation_failed",
      error_message: error.message,
    });
    throw error;
  }
};

export const getProperty = async (id) => {
  try {
    const docRef = doc(db, "properties", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      logAnalyticsEvent("view_report", {
        report_id: id,
        address: docSnap.data().mapsData.address,
      });
      return docSnap.data();
    } else {
      logAnalyticsEvent("error", {
        error_type: "document_not_found",
        report_id: id,
      });
      throw new Error("Property not found");
    }
  } catch (error) {
    console.error("Error fetching document:", error);
    logAnalyticsEvent("error", {
      error_type: "document_fetch_failed",
      error_message: error.message,
      report_id: id,
    });
    throw error;
  }
};
