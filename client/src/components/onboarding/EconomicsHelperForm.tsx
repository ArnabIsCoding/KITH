
import React, { useCallback, useEffect, useState } from "react";
import { UserAuth } from "../../context/AuthContext";
import { OnboardPageProps } from "../../models/OnboardPageProps";
import { ref, update, get } from "firebase/database";
import { database, auth as firebaseAuth } from "../../firebase";
import {
  Paper,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Button,
  Slider,
  Box
} from "@mui/material";
import InsightsIcon from '@mui/icons-material/Insights';

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = firebaseAuth.currentUser;
  if (!user) return { "Content-Type": "application/json" };
  try {
    const token = await user.getIdToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  } catch {
    return { "Content-Type": "application/json" };
  }
}
const parseSalaryRange = (salaryStr: string): [number, number] => {
  const numbers = salaryStr.replace(/[^0-9-]/g, '').split('-').map(Number);
  if (numbers.length === 2) return [numbers[0], numbers[1]];
  if (numbers.length === 1) return [numbers[0], numbers[0] + 5000];
  return [15000, 30000];
};

const formatForGoogleMaps = (rawLocation: string) => {
  if (!rawLocation) return { cleaned: "", url: "" };
  const cleaned = rawLocation.replace(/^[0-9A-Z]{4}\+[0-9A-Z]{2,3}(, )?/, '').trim();
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleaned)}`;
  return { cleaned, url };
};

const EconomicsHelperForm = (props: OnboardPageProps) => {
  const auth = UserAuth();
  const [fetchedLocation, setFetchedLocation] = useState<string>("");

  const [salaryRange, setSalaryRange] = useState<number[]>([20000, 40000]);
  const [economicStrength, setEconomicStrength] = useState<string>("Medium");
  const [aiExplanation, setAiExplanation] = useState<string>("");

  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const marks = [
    { value: 10000,  label: '10k'   },
    { value: 25000,  label: '25k'   },
    { value: 58333,  label: '60K'   },
    { value: 100000, label: '1L'    },
    { value: 125000, label: '1.25L' },
    { value: 150000, label: '1.5L'  },
    { value: 250000, label: '2.5L'  },
  ];

  const saveData = useCallback(() => {
    const mapsData = formatForGoogleMaps(fetchedLocation);
    return {
      baseLocation: fetchedLocation,
      mapsFriendlyLocation: mapsData.cleaned,
      mapsUrl: mapsData.url,
      salaryMin: salaryRange[0],
      salaryMax: salaryRange[1],
      economicStrength,
      aiExplanation
    };
  }, [fetchedLocation, salaryRange, economicStrength, aiExplanation]);

  useEffect(() => {
    props.registerSave(saveData);
  }, [props, saveData]);

  useEffect(() => {
    const handleLocationSync = (event: any) => setFetchedLocation(event.detail);
    window.addEventListener('onboard_location_change', handleLocationSync);

    const loadInitialData = async () => {
      if (!auth?.user) return;
      const userRef = ref(database, `users/${auth.user.id}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setFetchedLocation(prev => prev || userData.communityLocation || userData.communityWard || "");
        if (userData.economics) {
          const { salaryMin, salaryMax } = userData.economics;
          if (salaryMin && salaryMax) setSalaryRange([salaryMin, salaryMax]);
          setEconomicStrength(userData.economics.economicStrength || "Medium");
          setAiExplanation(userData.economics.aiExplanation || "");
        }
      }
    };
    loadInitialData();
    return () => window.removeEventListener('onboard_location_change', handleLocationSync);
  }, [auth?.user]);

  const handleAnalyzeEconomy = async () => {
    if (!fetchedLocation) {
      setError("Please set a location in the 'Basic Profile Data' section above first.");
      return;
    }
    try {
      setAnalyzing(true);
      setError(null);
      const authHeader = await getAuthHeader();

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/analyzeEconomy`, {
        method:  "POST",
        headers: authHeader,
        body:    JSON.stringify({ location: fetchedLocation }),
      });
      const result = await response.json();
      if (result.success && result.data) {
        setSalaryRange(parseSalaryRange(result.data.estimated_salary));
        setEconomicStrength(result.data.economic_strength || "Medium");
        setAiExplanation(result.data.explanation || "");
      } else {
        setError(result.error || "AI analysis failed.");
      }
    } catch (err) {
      setError("Network error while reaching the AI server.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <>
      <Typography variant="h4" sx={{ mt: 2, mb: 1, textAlign: "center" }}>Economic Overview</Typography>
      <Typography variant="body2" mb="1.5rem" sx={{ textAlign: "center" }}>
        Review estimated economic metrics based on your community location.
      </Typography>

      <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
        <Paper variant="outlined" sx={{ p: 4, borderRadius: "0.5rem", backgroundColor: "#F3F5EA", width: "100%", maxWidth: "600px" }}>
          <Stack spacing={4}>
            {error && <Alert severity="error">{error}</Alert>}

            <div>
              <Typography variant="subtitle2" gutterBottom>Synced Location</Typography>
              <TextField fullWidth size="small" value={fetchedLocation} disabled sx={{ backgroundColor: "#e9ecef" }} />
            </div>

            <Button
              variant="contained" color="success" onClick={handleAnalyzeEconomy}
              disabled={analyzing || !fetchedLocation}
              startIcon={analyzing ? <CircularProgress size={20} color="inherit" /> : <InsightsIcon />}
              sx={{ py: 1.5, fontWeight: "bold" }}
            >
              {analyzing ? "Analyzing Data..." : "Generate AI Economic Estimate"}
            </Button>

            {salaryRange && (
              <Box sx={{ px: 2 }}>
                <Typography gutterBottom variant="subtitle2">
                  Estimated Monthly Salary Range: ₹{salaryRange[0].toLocaleString()} - ₹{salaryRange[1].toLocaleString()}
                </Typography>
                <Slider
                  value={salaryRange}
                  onChange={(e, newValue) => setSalaryRange(newValue as number[])}
                  valueLabelDisplay="auto"
                  min={10000}
                  max={250000}
                  step={1000}
                  marks={marks}
                  color="success"
                  sx={{ mt: 2, mb: 4 }}
                />

                <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                  <InputLabel>Economic Strength</InputLabel>
                  <Select value={economicStrength} label="Economic Strength" onChange={(e) => setEconomicStrength(e.target.value)}>
                    <MenuItem value="Low">Low</MenuItem>
                    <MenuItem value="Medium">Medium</MenuItem>
                    <MenuItem value="High">High</MenuItem>
                  </Select>
                </FormControl>

                {aiExplanation && (
                  <Paper variant="outlined" sx={{ p: 2, mt: 3, backgroundColor: "#fff", borderColor: "#c8e6c9" }}>
                    <Typography variant="subtitle2" color="primary">AI Context:</Typography>
                    <Typography variant="body2">{aiExplanation}</Typography>
                  </Paper>
                )}
              </Box>
            )}
          </Stack>
        </Paper>
      </div>
    </>
  );
};

export default EconomicsHelperForm;
