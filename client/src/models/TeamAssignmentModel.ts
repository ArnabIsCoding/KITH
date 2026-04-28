export interface TeamAssignmentModel {
  id: string;
  northEast: { lat: number; lng: number };
  southWest: { lat: number; lng: number };
  assignedTo: string;
  assignedAt: string;
  fieldNotes?: string;
  riskLevel?: number;
	totalPeople?: number;
	geminiExplanation?: string;
  riskFactors?: string[];
  initialSummary?: string;
  economicStrength?: string;
  crimeReasoning?: string;
  avgSalary?: string;
  crimeScore?: number;
  crimeTypes?: string[];
}
