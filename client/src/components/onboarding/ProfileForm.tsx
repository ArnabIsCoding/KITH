import React, { useCallback, useEffect, useState, useRef } from "react";
import { UserAuth } from "../../context/AuthContext";
import { OnboardPageProps } from "../../models/OnboardPageProps";
import {
  Typography,
  Paper,
  Stack,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  TextField,
  Box
} from "@mui/material";
import { ref, update, get } from "firebase/database";
import { database } from "../../firebase";
import { useJsApiLoader } from '@react-google-maps/api';

const mapLibraries: ("drawing" | "visualization" | "places")[] = ["drawing", "visualization", "places"];

const ProfileForm = (props: OnboardPageProps) => {
  const auth = UserAuth();
  const [ageGroup, setAgeGroup] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [communityLocation, setCommunityLocation] = useState<string>("");
  const [demographicSize, setDemographicSize] = useState<number | "">("");
  const [collectionDate, setCollectionDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerInstance = useRef<google.maps.Marker | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_googleMapsAPIKey || process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "",
    libraries: mapLibraries,
  });

  useEffect(() => {
    if (communityLocation) {
      window.dispatchEvent(new CustomEvent('onboard_location_change', { detail: communityLocation }));
    }
  }, [communityLocation]);

  const saveData = useCallback(() => {
    return {
      ageGroup,
      gender,
      address: communityLocation,
      communityLocation,
      demographicSize,
      collectionDate,
    };
  }, [ageGroup, gender, communityLocation, demographicSize, collectionDate]);
  useEffect(() => {
    if (auth?.user) {
      const userRef = ref(database, `users/${auth.user.id}`);
      get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
          const user = snapshot.val();
          if (user.ageGroup) setAgeGroup(user.ageGroup);
          if (user.gender) setGender(user.gender);
          if (user.communityLocation || user.communityWard) {
            setCommunityLocation(user.communityLocation || user.communityWard);
          }
          if (user.demographicSize) setDemographicSize(user.demographicSize);
        }
      });
    }
  }, [auth?.user]);

  useEffect(() => {
    props.registerSave(saveData);
  }, [props, props.registerSave, saveData]);

  useEffect(() => {
    if (isLoaded && mapRef.current && !mapInstance.current && window.google) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 20.5937, lng: 78.9629 },
        zoom: 5,
        mapTypeControl: false,
        streetViewControl: false,
      });

      markerInstance.current = new window.google.maps.Marker({
        map: mapInstance.current,
        draggable: true,
      });

      const geocoder = new window.google.maps.Geocoder();

      const updateAddressFromLatLng = (latLng: google.maps.LatLng) => {
        geocoder.geocode({ location: latLng }, (results, status) => {
          if (status === "OK" && results && results[0]) {
            setCommunityLocation(results[0].formatted_address);
          } else {
            setCommunityLocation(`Lat: ${latLng.lat().toFixed(4)}, Lng: ${latLng.lng().toFixed(4)}`);
          }
        });
      };

      mapInstance.current.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          markerInstance.current?.setPosition(e.latLng);
          updateAddressFromLatLng(e.latLng);
        }
      });

      markerInstance.current.addListener("dragend", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          updateAddressFromLatLng(e.latLng);
        }
      });

      if (navigator.geolocation && !communityLocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            mapInstance.current?.setCenter(pos);
            mapInstance.current?.setZoom(14);
            markerInstance.current?.setPosition(pos);
            updateAddressFromLatLng(new window.google.maps.LatLng(pos.lat, pos.lng));
          },
          () => {
            console.warn("Geolocation permission denied or failed.");
          }
        );
      }
    }
  }, [isLoaded, communityLocation]);

  const styles = {
    container: {
      display: "flex",
      flexDirection: "row" as "row",
      justifyContent: "center",
      padding: "20px",
    },
    paper: {
      display: "flex",
      flexDirection: "column" as "column",
      padding: "2rem",
      borderRadius: "0.5rem",
      backgroundColor: "#F3F5EA",
      width: "100%",
      maxWidth: "600px",
    },
    map: {
      width: "100%",
      height: "250px",
      borderRadius: "8px",
      marginTop: "10px",
      border: "1px solid #ccc",
    }
  };

  return (
    <>
      <Typography variant="h4" sx={{ marginTop: "1rem", marginBottom: "0.5rem", textAlign: "center" }}>
        Basic Profile Data
      </Typography>
      <Typography variant="body2" mb="1.5rem" sx={{ textAlign: "center" }}>
        Please provide your anonymized demographic details.
      </Typography>

      <div style={styles.container}>
        <Paper variant="outlined" style={styles.paper}>
          <Stack spacing={3} width={"100%"}>
            <FormControl fullWidth size="small">
              <InputLabel>Age Group</InputLabel>
              <Select value={ageGroup} label="Age Group" onChange={(e) => setAgeGroup(e.target.value)}>
                <MenuItem value="18-24">18-24</MenuItem>
                <MenuItem value="25-34">25-34</MenuItem>
                <MenuItem value="35+">35+</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Gender</InputLabel>
              <Select value={gender} label="Gender" onChange={(e) => setGender(e.target.value)}>
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
                <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
              </Select>
            </FormControl>

            <TextField
              variant="outlined"
              fullWidth
              size="small"
              type="number"
              label="Total People in this Demographic"
              placeholder="e.g. 50"
              value={demographicSize}
              onChange={(e) => setDemographicSize(e.target.value === "" ? "" : Number(e.target.value))}
              InputProps={{ inputProps: { min: 0 } }}
            />

            <div>
              <TextField
                variant="outlined"
                fullWidth
                size="small"
                label="Confirm or Edit Location Details"
                value={communityLocation}
                onChange={(e) => setCommunityLocation(e.target.value)}
                helperText="Drag the pin below, or manually type your location here."
                sx={{ mb: 1, mt: 1 }}
              />

              <div ref={mapRef} style={styles.map}>
                {!isLoaded && <Typography align="center" mt={10}>Loading Map...</Typography>}
              </div>
            </div>

            <TextField
              size="small"
              type="date"
              label="Collection Date"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </Paper>
      </div>
    </>
  );
};

export default ProfileForm;
