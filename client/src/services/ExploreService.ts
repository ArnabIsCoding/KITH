import { auth } from "../firebase";

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

export const fetchCrimeHeatmapData = async (locations: { id: string, lat: number, lng: number, address?: string }[]) => {
  try {
    const authHeader = await getAuthHeader();

    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/analyzeMapCrime`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ locations })
    });
		const result = await response.json();
		console.log(result);
    if (result.success) {
			return result.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching map crime data:", error);
    return [];
  }
};
