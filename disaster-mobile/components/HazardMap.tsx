import { StyleSheet } from "react-native";
import MapView, { Marker, Polyline, UrlTile, PROVIDER_GOOGLE } from "react-native-maps";

import { SAFE_ROUTES } from "@/lib/safe-routes";
import { colors } from "@/lib/theme";
import { COLOMBO_CENTER, PIN_COLORS } from "@/lib/types";

import type { HazardMapProps } from "./hazard-map-types";

const TILES = "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";

export function HazardMap({ hazards, routeWards }: HazardMapProps) {
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      provider={PROVIDER_GOOGLE}
      mapType="none"
      initialRegion={{
        ...COLOMBO_CENTER,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }}
    >
      <UrlTile urlTemplate={TILES} maximumZ={19} tileSize={256} zIndex={-1} />
      {hazards.map((hazard) => (
        <Marker
          key={hazard.id}
          coordinate={{ latitude: hazard.lat, longitude: hazard.lng }}
          pinColor={PIN_COLORS[hazard.status]}
          title={hazard.category}
          description={`${hazard.status} · ${hazard.description ?? ""}`}
        />
      ))}
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
