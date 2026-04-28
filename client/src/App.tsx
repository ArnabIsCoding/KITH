import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Protected from "./components/Protected";
import SignInPage from "./pages/SignInPage";
import Dashboard from "./pages/Dashboard";
import LandingPage from "./pages/LandingPage";
import NotFoundPage from "./pages/NotFoundPage";
import { AuthContextProvider } from "./context/AuthContext";
import TeamManagementPage from "./pages/TeamManagementPage";
import { Loader } from "@googlemaps/js-api-loader";
import "./App.css";
import OnboardingPage from "./pages/OnboardingPage";
import {
  ThemeProvider as MaterialUIThemeProvider,
  createTheme,
} from "@mui/material/styles";
import ActiveDeployments from "./pages/ActiveDeployments";
import ExplorePage from "./pages/ExplorePage";
import KithCursor from "./components/KithCursor";
import OfflineQueuePanel from "./components/OfflineQueuePanel";
import ImpactPage from "./pages/ImpactPage";

const MATERIAL_THEME = createTheme({
  typography: {
    fontFamily: `"Inter", "ProductSans", sans-serif`,
  },
});

function App() {
  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.REACT_APP_googleMapsAPIKey || process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "",
      version: "weekly",
      libraries: ["places", "drawing", "visualization"],
    });

    loader.importLibrary("maps").then(() => {
      console.log("Google Maps API loaded globally with Drawing Tools.");
    }).catch(err => console.error("Map Load Error:", err));

    loader.importLibrary("marker").then(() => {
      console.log("Google Maps Marker API loaded.");
    }).catch(err => console.error("Marker Load Error:", err));
  }, []);

  return (
    <div className="App">
      <KithCursor />

      <MaterialUIThemeProvider theme={MATERIAL_THEME}>
        <AuthContextProvider>
          <Router>
            <Routes>
              <Route path="/dashboard"    element={<Protected><Dashboard /></Protected>} />
              <Route path="/onboarding/*" element={<Protected><OnboardingPage /><OfflineQueuePanel /></Protected>} />
              <Route path="/active-deployments"      element={<Protected><ActiveDeployments /></Protected>} />
              <Route path="/explore"      element={<Protected><ExplorePage /></Protected>} />
              <Route path="/team"         element={<Protected><TeamManagementPage /></Protected>} />
              <Route path="/"             element={<LandingPage />} />
              <Route path="/login"        element={<SignInPage />} />
              <Route path="/not-found"    element={<NotFoundPage />} />
              <Route path="/impact"        element={<Protected><ImpactPage /></Protected>} />
              <Route path="*"             element={<NotFoundPage />} />
            </Routes>
          </Router>
        </AuthContextProvider>
      </MaterialUIThemeProvider>
    </div>
  );
}

export default App;
