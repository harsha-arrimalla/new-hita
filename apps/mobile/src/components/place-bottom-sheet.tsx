import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Pressable,
  ScrollView,
  Image,
  Linking,
  ActivityIndicator,
} from "react-native";
import { colors, spacing, radii, shadows } from "@/lib/tokens";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SNAP_PEEK = SCREEN_HEIGHT * 0.55;
const SNAP_FULL = SCREEN_HEIGHT * 0.92;
const DISMISS_THRESHOLD = SCREEN_HEIGHT * 0.3;

export interface PlaceData {
  name: string;
  type: "restaurant" | "activity" | "attraction" | "hotel" | "cafe";
  image?: string;
  rating?: number;
  reviewCount?: string;
  priceLevel?: string;
  cuisine?: string;
  location: string;
  distance?: string;
  hours?: string;
  tags?: string[];
  description?: string;
  price?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
}

interface PlaceDetails {
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  totalRatings?: number;
  isOpen?: boolean;
  phone?: string;
  website?: string;
  photoUrls: string[];
  weekdayHours?: string[];
  reviews?: { author: string; rating: number; text: string }[];
  editorialSummary?: string;
  insights: {
    history: string;
    thingsToDo: string[];
    timeSuggestion: string;
    vibe: string;
  };
}

const API_URL =
  typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL
    ? process.env.EXPO_PUBLIC_API_URL
    : "http://localhost:3000";

export function PlaceBottomSheet({
  place,
  onClose,
}: {
  place: PlaceData;
  onClose: () => void;
}) {
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const currentHeight = useRef(SNAP_PEEK);

  // Fetch details
  useEffect(() => {
    if (!place.placeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${API_URL}/places/${encodeURIComponent(place.placeId)}`)
      .then((r) => r.json())
      .then((data) => setDetails(data as PlaceDetails))
      .catch(() => setDetails(null))
      .finally(() => setLoading(false));
  }, [place.placeId]);

  // Animate in
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: SCREEN_HEIGHT - SNAP_PEEK,
        tension: 65,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: SCREEN_HEIGHT,
        tension: 65,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const snapTo = (height: number) => {
    currentHeight.current = height;
    Animated.spring(translateY, {
      toValue: SCREEN_HEIGHT - height,
      tension: 65,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        const newY = SCREEN_HEIGHT - currentHeight.current + gestureState.dy;
        if (newY >= SCREEN_HEIGHT - SNAP_FULL) {
          translateY.setValue(newY);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const movedTo =
          SCREEN_HEIGHT - currentHeight.current + gestureState.dy;
        const sheetH = SCREEN_HEIGHT - movedTo;

        if (sheetH < DISMISS_THRESHOLD || gestureState.vy > 1.5) {
          dismiss();
        } else if (sheetH > (SNAP_PEEK + SNAP_FULL) / 2) {
          snapTo(SNAP_FULL);
        } else {
          snapTo(SNAP_PEEK);
        }
      },
    })
  ).current;

  const todayHours = details?.weekdayHours
    ? details.weekdayHours[
        new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
      ]
    : null;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY }], height: SNAP_FULL },
        ]}
      >
        {/* Drag handle */}
        <View {...panResponder.panHandlers} style={styles.handleArea}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle} numberOfLines={1}>
            {place.name}
          </Text>
          <Pressable onPress={dismiss} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          bounces
        >
          {/* Photo */}
          {(details?.photoUrls?.[0] || place.image) && (
            <Image
              source={{ uri: details?.photoUrls?.[0] || place.image }}
              style={styles.photo}
              resizeMode="cover"
            />
          )}

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={colors.ink} />
              <Text style={styles.loadingText}>Loading details...</Text>
            </View>
          ) : (
            <View style={styles.content}>
              {/* Rating row */}
              <View style={styles.ratingRow}>
                {(details?.rating || place.rating) && (
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>
                      ★ {details?.rating || place.rating}
                    </Text>
                  </View>
                )}
                {details?.totalRatings && (
                  <Text style={styles.reviewCount}>
                    ({details.totalRatings.toLocaleString()} reviews)
                  </Text>
                )}
                {details?.isOpen != null && (
                  <View
                    style={[
                      styles.openBadge,
                      !details.isOpen && styles.closedBadge,
                    ]}
                  >
                    <Text style={styles.openText}>
                      {details.isOpen ? "Open now" : "Closed"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Vibe */}
              {details?.insights.vibe && (
                <Text style={styles.vibe}>{details.insights.vibe}</Text>
              )}

              {/* Address */}
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>📍</Text>
                <Text style={styles.infoValue}>
                  {details?.address || place.location}
                </Text>
              </View>

              {todayHours && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>🕐</Text>
                  <Text style={styles.infoValue}>{todayHours}</Text>
                </View>
              )}

              {details?.phone && (
                <Pressable
                  style={styles.infoSection}
                  onPress={() => Linking.openURL(`tel:${details.phone}`)}
                >
                  <Text style={styles.infoLabel}>📞</Text>
                  <Text style={[styles.infoValue, styles.link]}>
                    {details.phone}
                  </Text>
                </Pressable>
              )}

              {details?.website && (
                <Pressable
                  style={styles.infoSection}
                  onPress={() => Linking.openURL(details.website!)}
                >
                  <Text style={styles.infoLabel}>🌐</Text>
                  <Text
                    style={[styles.infoValue, styles.link]}
                    numberOfLines={1}
                  >
                    {new URL(details.website).hostname}
                  </Text>
                </Pressable>
              )}

              {/* Directions button */}
              <Pressable
                style={({ pressed }) => [
                  styles.directionsBtn,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => {
                  const lat = details?.lat || place.lat;
                  const lng = details?.lng || place.lng;
                  if (lat && lng) {
                    Linking.openURL(
                      `https://maps.apple.com/?daddr=${lat},${lng}`
                    );
                  }
                }}
              >
                <Text style={styles.directionsBtnText}>
                  🧭 Get directions
                </Text>
              </Pressable>

              {/* Time suggestion */}
              {details?.insights.timeSuggestion && (
                <View style={styles.insightCard}>
                  <Text style={styles.insightLabel}>💡 Right now</Text>
                  <Text style={styles.insightText}>
                    {details.insights.timeSuggestion}
                  </Text>
                </View>
              )}

              {/* About */}
              {details?.insights.history && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>About this place</Text>
                  <Text style={styles.sectionText}>
                    {details.insights.history}
                  </Text>
                </View>
              )}

              {/* Things to do */}
              {details?.insights?.thingsToDo && details.insights.thingsToDo.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Things to do</Text>
                  {details.insights.thingsToDo.map((item, i) => (
                    <View key={i} style={styles.todoItem}>
                      <Text style={styles.todoIcon}>✨</Text>
                      <Text style={styles.todoText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Reviews */}
              {details?.reviews && details.reviews.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Reviews</Text>
                  {details.reviews.slice(0, 3).map((review, i) => (
                    <View key={i} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewAvatar}>
                          <Text style={styles.reviewAvatarText}>
                            {review.author.charAt(0)}
                          </Text>
                        </View>
                        <Text style={styles.reviewAuthor}>
                          {review.author}
                        </Text>
                        <Text style={styles.reviewRating}>
                          ★ {review.rating}
                        </Text>
                      </View>
                      <Text
                        style={styles.reviewText}
                        numberOfLines={3}
                      >
                        {review.text}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ height: 40 }} />
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...shadows.lg,
  },
  handleArea: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.borderSoft,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.hover,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontSize: 16,
    color: colors.textSecondary,
  },

  photo: {
    width: "100%",
    height: 220,
  },

  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textTertiary,
  },

  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
  },
  ratingBadge: {
    backgroundColor: colors.ink,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textInverse,
  },
  reviewCount: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  openBadge: {
    backgroundColor: colors.tint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  closedBadge: {
    backgroundColor: colors.pressed,
  },
  openText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  vibe: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginBottom: spacing.lg,
  },

  infoSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: spacing.md,
  },
  infoLabel: { fontSize: 16, marginTop: 1 },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  link: {
    color: colors.textPrimary,
    textDecorationLine: "underline",
  },

  directionsBtn: {
    backgroundColor: colors.ink,
    paddingVertical: 14,
    borderRadius: radii.xl,
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  directionsBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textInverse,
  },

  insightCard: {
    backgroundColor: colors.tint,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.lg,
  },
  insightLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  insightText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  sectionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  todoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.hover,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  todoIcon: { fontSize: 14, marginTop: 1 },
  todoText: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },

  reviewCard: {
    borderWidth: 1,
    borderColor: colors.borderHairline,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  reviewAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.hover,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAvatarText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  reviewAuthor: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textPrimary,
    flex: 1,
  },
  reviewRating: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  reviewText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
