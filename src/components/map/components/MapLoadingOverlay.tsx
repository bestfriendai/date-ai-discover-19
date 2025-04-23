
export const MapLoadingOverlay = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20 rounded-xl">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  );
};
