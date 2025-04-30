import { Event } from '@/types';

export function createPartyMarker(
  map: google.maps.Map,
  event: Event,
  onClick: (event: Event) => void
): google.maps.Marker {
  // Choose icon based on party subcategory
  let iconUrl = '/icons/marker-general.svg';
  
  // Default size for markers
  const size = new google.maps.Size(32, 32);
  const scaledSize = new google.maps.Size(32, 32);
  const anchor = new google.maps.Point(16, 32);
  
  // Use party subcategory to determine marker type
  if (event.partySubcategory === 'nightclub') {
    iconUrl = '/icons/marker-club.svg';
  } else if (event.partySubcategory === 'festival') {
    iconUrl = '/icons/marker-festival.svg';
  } else if (event.partySubcategory === 'brunch') {
    iconUrl = '/icons/marker-brunch.svg';
  } else if (event.partySubcategory === 'day party') {
    iconUrl = '/icons/marker-day-party.svg';
  } else if (event.partySubcategory === 'rooftop') {
    iconUrl = '/icons/marker-rooftop.svg';
  } else if (event.partySubcategory === 'immersive') {
    iconUrl = '/icons/marker-immersive.svg';
  } else if (event.partySubcategory === 'popup') {
    iconUrl = '/icons/marker-popup.svg';
  }

  // Create marker icon
  const icon = {
    url: iconUrl,
    size: size,
    scaledSize: scaledSize,
    anchor: anchor
  };
  
  // Get marker position from event coordinates or lat/lng
  let position: google.maps.LatLng;
  
  if (event.coordinates && Array.isArray(event.coordinates) && event.coordinates.length === 2) {
    // Use coordinates array [lng, lat] format
    position = new google.maps.LatLng(event.coordinates[1], event.coordinates[0]);
  } else if (event.latitude !== undefined && event.longitude !== undefined) {
    // Use separate lat/lng properties
    position = new google.maps.LatLng(event.latitude, event.longitude);
  } else {
    // Fallback - should never happen if events are filtered correctly
    console.error('Event missing valid coordinates:', event);
    position = new google.maps.LatLng(0, 0);
  }
  
  // Create and return the marker
  const marker = new google.maps.Marker({
    position,
    map,
    icon,
    title: event.title,
    animation: google.maps.Animation.DROP
  });
  
  // Add click handler
  marker.addListener('click', () => {
    onClick(event);
  });
  
  return marker;
}
