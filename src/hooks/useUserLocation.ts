
import { useCallback } from "react";
import { toast } from "@/hooks/use-toast";

/**
 * Custom hook to get the user's current geolocation.
 * Returns a function that resolves to [longitude, latitude].
 */
export function useUserLocation() {
  const getUserLocation = useCallback(async (): Promise<[number, number]> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        toast({ 
          title: "Geolocation not supported", 
          variant: "destructive" 
        });
        return reject(new Error("Geolocation not supported"));
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Ensure coordinates are valid
          const longitude = position.coords.longitude;
          const latitude = position.coords.latitude;
          
          if (isNaN(longitude) || isNaN(latitude) || 
              longitude < -180 || longitude > 180 || 
              latitude < -90 || latitude > 90) {
            const msg = "Invalid coordinates received from geolocation.";
            toast({ 
              title: "Location error", 
              description: msg, 
              variant: "destructive" 
            });
            return reject(new Error(msg));
          }
          
          resolve([longitude, latitude]);
        },
        (error) => {
          let msg = "An unknown error occurred.";
          if (error.code === 1) msg = "Location permission denied.";
          if (error.code === 2) msg = "Location information unavailable.";
          if (error.code === 3) msg = "Location request timed out.";
          
          toast({ 
            title: "Location error", 
            description: msg, 
            variant: "destructive" 
          });
          
          reject(error);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 10000, 
          maximumAge: 0 
        }
      );
    });
  }, []);

  return { getUserLocation };
}
