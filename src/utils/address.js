export const extractAddressDetails = (place) => {
  let streetNumber = "";
  let route = "";
  let unit = "";
  let city = "";
  let state = "";
  let zip = "";

  for (const component of place.address_components) {
    const type = component.types[0];

    switch (type) {
      case "street_number":
        streetNumber = component.long_name;
        break;
      case "route":
        route = component.short_name;
        break;
      case "subpremise":
        unit = component.long_name;
        break;
      case "locality":
        city = component.long_name;
        break;
      case "administrative_area_level_1":
        state = component.short_name;
        break;
      case "postal_code":
        zip = component.long_name;
        break;
    }
  }

  // Construct address with unit number if present
  const address = unit
    ? `${streetNumber} ${route} #${unit}`.trim()
    : `${streetNumber} ${route}`.trim();

  return {
    address,
    city,
    state,
    zip,
    formatted_address: place.formatted_address,
    latitude: place.geometry.location.lat(),
    longitude: place.geometry.location.lng(),
    place_id: place.place_id,
    url: place.url,
  };
};
