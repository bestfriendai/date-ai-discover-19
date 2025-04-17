import React from 'react';
import type { ClusterFeature } from '../clustering/useSupercluster';

interface DebugOverlayProps {
  events: ClusterFeature[];
  clusters: ClusterFeature[];
  mapLoaded: boolean;
  mapError: string | null;
  viewState: { latitude: number; longitude: number; zoom: number };
  filters: any;
}

const DebugOverlay: React.FC<DebugOverlayProps> = ({ events, clusters, mapLoaded, mapError, viewState, filters }) => {
  if (typeof window !== 'undefined' && !window.location.search.includes('debug=1')) return null;
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: 12, zIndex: 9999, padding: 8, maxWidth: 400 }}>
      <div><b>MAP_DEBUG Overlay</b></div>
      <div>Loaded: {mapLoaded ? 'Yes' : 'No'}</div>
      <div>Error: {mapError || 'None'}</div>
      <div>Events: {events.length}</div>
      <div>Clusters: {clusters.length}</div>
      <div>Center: {viewState.latitude.toFixed(4)}, {viewState.longitude.toFixed(4)}</div>
      <div>Zoom: {viewState.zoom}</div>
      <div>Filters: {JSON.stringify(filters)}</div>
      <div>Time: {new Date().toLocaleTimeString()}</div>
    </div>
  );
};

export default DebugOverlay;
