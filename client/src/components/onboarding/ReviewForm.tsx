
import React, { useCallback, useEffect, useState } from "react";
import { OnboardPageProps } from "../../models/OnboardPageProps";
import { Paper, Stack, TextField, Typography, Slider, FormControl, InputLabel, Select, MenuItem, Grid, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

export interface MentalHealthModel {
  title: string;
  stressLevel: number;
  happinessScore: number;
  mentalCondition: string;
  additionalNotes: string;
  demographicSize: number | "";
}

const MentalHealthCard = ({
  healthId,
  healthProp,
  deleteCallback,
  updateCallback
}: {
  healthId: string,
  healthProp: MentalHealthModel,
  deleteCallback: () => void,
  updateCallback: (data: MentalHealthModel) => void
}) => {
  const [health, setHealth] = useState<MentalHealthModel>(healthProp);

  const handleChange = (field: keyof MentalHealthModel, value: any) => {
    const updatedHealth = { ...health, [field]: value };
    setHealth(updatedHealth);
    updateCallback(updatedHealth);
  };

  const handleTextChange = (field: keyof MentalHealthModel, value: any) => {
    const updatedHealth = { ...health, [field]: value };
    setHealth(updatedHealth);
    updateCallback(updatedHealth);
  };

  return (
    <Paper style={{ padding: "1.5rem", borderRadius: "8px", backgroundColor: "#F3F5EA", border: "1px solid #ddd", height: "100%", display: "flex", flexDirection: "column" }}>
      <Stack spacing={3} sx={{ flexGrow: 1 }}>
        <TextField
          variant="standard"
          placeholder="Group Title (e.g. Remote Workers)"
          value={health.title}
          onChange={(e) => handleTextChange("title", e.target.value)}
          InputProps={{ style: { fontSize: '1.5rem', fontWeight: 'bold' } }}
        />

        <TextField
          variant="outlined"
          fullWidth
          size="small"
          type="number"
          label="Target Demographic (Number of people)"
          value={health.demographicSize || ""}
          onChange={(e) => handleTextChange("demographicSize", e.target.value === "" ? "" : Number(e.target.value))}
          InputProps={{ inputProps: { min: 0 } }}
        />

        <div>
          <Typography variant="subtitle2" gutterBottom>Stress Level (1-10): {health.stressLevel}</Typography>
          <Slider value={health.stressLevel} onChange={(e, val) => handleChange("stressLevel", val)} step={1} marks min={1} max={10} color="error" />
        </div>

        <div>
          <Typography variant="subtitle2" gutterBottom>Happiness Score (1-10): {health.happinessScore}</Typography>
          <Slider value={health.happinessScore} onChange={(e, val) => handleChange("happinessScore", val)} step={1} marks min={1} max={10} color="primary" />
        </div>

        <FormControl fullWidth size="small">
          <InputLabel>Diagnosed Mental Condition</InputLabel>
          <Select value={health.mentalCondition} label="Diagnosed Mental Condition" onChange={(e) => handleChange("mentalCondition", e.target.value)}>
            <MenuItem value="None">None</MenuItem>
            <MenuItem value="Anxiety">Anxiety</MenuItem>
            <MenuItem value="Depression">Depression</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Additional Notes (Optional)"
          multiline
          rows={3}
          variant="outlined"
          fullWidth
          value={health.additionalNotes}
          onChange={(e) => handleTextChange("additionalNotes", e.target.value)}
        />
      </Stack>

      <Stack direction="row" justifyContent="flex-end" mt={3}>
        <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={deleteCallback}>
          Delete
        </Button>
      </Stack>
    </Paper>
  );
};

const ReviewForm = (props: OnboardPageProps) => {
  const [healthRecords, setHealthRecords] = useState<{ id: string, data: MentalHealthModel }[]>([]);
  const saveData = useCallback(() => {
    return healthRecords.map(h => h.data);
  }, [healthRecords]);

  useEffect(() => { props.registerSave(saveData); }, [props, saveData]);

  const handleAdd = () => {
    const newId = Date.now().toString();
    const newRecord: MentalHealthModel = {
      title: "",
      stressLevel: 5,
      happinessScore: 5,
      mentalCondition: "None",
      additionalNotes: "",
      demographicSize: ""
    };

    setHealthRecords([...healthRecords, { id: newId, data: newRecord }]);
  };

  const handleDelete = (idToRemove: string) => {
    setHealthRecords((prev) => prev.filter((item) => item.id !== idToRemove));
  };

  const handleUpdate = (idToUpdate: string, updatedData: MentalHealthModel) => {
    setHealthRecords((prev) => prev.map(item => item.id === idToUpdate ? { ...item, data: updatedData } : item));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <Typography variant="h4" sx={{ marginTop: "1rem", textAlign: "center" }}>Mental & Emotional Indicators</Typography>
      <Stack direction="row" justifyContent="flex-end" width="100%" mb={2}>
        <Button variant="outlined" color="primary" startIcon={<AddIcon />} onClick={handleAdd}>Add Demographic</Button>
      </Stack>
      <Grid container spacing={3}>
        {healthRecords.map((item) => (
          <Grid item xs={12} md={6} key={item.id}>
            <MentalHealthCard
              healthId={item.id}
              healthProp={item.data}
              deleteCallback={() => handleDelete(item.id)}
              updateCallback={(data) => handleUpdate(item.id, data)}
            />
          </Grid>
        ))}
      </Grid>
    </div>
  );
};

export default ReviewForm;
