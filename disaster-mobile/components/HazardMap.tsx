import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, UrlTile } from "react-native-maps";

import { SAFE_ROUTES } from "@/lib/safe-routes";
import { colors } from "@/lib/theme";
import { COLOMBO_CENTER, PIN_COLORS } from "@/lib/types";

import type { HazardMapProps } from "./hazard-map-types";

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export function HazardMap({
  hazards,
  routeWards,
  selectedHazardId,
  onSelectHazard,
  focusCoords,
}: HazardMapProps) {
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (focusCoords && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: focusCoords.latitude,
          longitude: focusCoords.longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        },
        400,
      );
    }
  }, [focusCoords]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      provider={PROVIDER_GOOGLE}
      mapType="none"
      onPress={() => onSelectHazard?.(null)}
      initialRegion={{
        ...COLOMBO_CENTER,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }}
    >
      <UrlTile urlTemplate={TILES} maximumZ={19} tileSize={256} zIndex={1} />
      {hazards.map((hazard) => {
        const isSelected = selectedHazardId === hazard.id;
        return (
          <Marker
            key={hazard.id}
            coordinate={{ latitude: hazard.lat, longitude: hazard.lng }}
            pinColor={PIN_COLORS[hazard.status]}
            title={hazard.category}
            description={`${hazard.status} · ${hazard.description ?? ""}`}
            onPress={(e) => {
              e.stopPropagation();
              onSelectHazard?.(hazard);
            }}
          />
        );
      })}
      {routeWards.map((wardId) => (
        <Polyline
          key={`route-${wardId}`}
          coordinates={SAFE_ROUTES[wardId]}
          strokeColor={colors.green}
          strokeWidth={3}
          lineDashPattern={[8, 6]}
        />
      ))}
    </MapView>
  );
}
