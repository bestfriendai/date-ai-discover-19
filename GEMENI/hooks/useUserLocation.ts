
import { useCallback } from "react";
import { toast } from "@/hooks/use-toast";

/**
 * Custom hook to get the user's current geolocation.
 * Returns a function that resolves to [longitude, latitude].
 */
export function useUserLocation() {
  const getUserLocation = useCallback(async (): Promise<[number, number]> => {
    return new Promise((resolve, reject) => {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        toast({
          title: "Geolocation not supported",
          description: "Your browser doesn't support location services. Try searching for a location instead.",
          variant: "destructive",
          duration: 5000
        });
        return reject(new Error("Geolocation not supported"));
      }

      // Show a loading toast
      const loadingToast = toast({
        title: "Finding your location",
        description: "Please allow location access when prompted...",
        duration: 10000 // Long duration as we'll dismiss it manually
      });

      // Set a timeout in case the browser takes too long to prompt
      const promptTimeout = setTimeout(() => {
        toast({
          title: "Waiting for permission",
          description: "Please respond to the location permission prompt in your browser",
          duration: 5000
        });
      }, 3000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Clear the timeout and dismiss loading toast
          clearTimeout(promptTimeout);
          loadingToast.dismiss();

          // Ensure coordinates are valid
          const longitude = position.coords.longitude;
          const latitude = position.coords.latitude;

          if (isNaN(longitude) || isNaN(latitude) ||
              longitude < -180 || longitude > 180 ||
              latitude < -90 || latitude > 90) {
            const msg = "Invalid coordinates received from geolocation.";
            toast({
              title: "Location error",
              description: "We received invalid coordinates from your device. Please try again or search for a location instead.",
              variant: "destructive",
              duration: 5000
            });
            return reject(new Error(msg));
          }

          // Success toast
          toast({
            title: "Location found",
            description: "Finding events near you...",
            duration: 3000
          });

          resolve([longitude, latitude]);
        },
        (error) => {
          // Clear the timeout and dismiss loading toast
          clearTimeout(promptTimeout);
          loadingToast.dismiss();

          let title = "Location error";
          let msg = "An unknown error occurred while trying to get your location.";

          // Provide more helpful messages based on error code
          if (error.code === 1) {
            title = "Location permission denied";
            msg = "You've denied access to your location. To use this feature, please enable location access in your browser settings and try again.";
          } else if (error.code === 2) {
            title = "Location unavailable";
            msg = "Your location couldn't be determined. This might be due to poor GPS signal or network issues.";
          } else if (error.code === 3) {
            title = "Location request timed out";
            msg = "It took too long to determine your location. Please try again or search for a location instead.";
          }

          toast({
            title: title,
            description: msg,
            variant: "destructive",
            duration: 5000
          });

          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // Increased timeout for better chance of success
          maximumAge: 0
        }
      );
    });
  }, []);

  return { getUserLocation };
}
