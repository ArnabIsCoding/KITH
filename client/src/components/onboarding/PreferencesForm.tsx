
import React, { useCallback, useEffect, useState } from "react";
import { OnboardPageProps } from "../../models/OnboardPageProps";
import { Typography, Paper, Stack, Slider, FormControl, InputLabel, Select, MenuItem, TextField, Grid, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

export interface LifestyleModel {
  title: string;
  sleepHours: number;
  screenTime: number;
  exerciseFrequency: string;
  dietQuality: string;
  demographicSize: number | "";
}

const LifestyleCard = ({
  habitId,
  habitProp,
  deleteCallback,
  updateCallback
}: {
  habitId: string,
  habitProp: LifestyleModel,
  deleteCallback: () => void,
  updateCallback: (data: LifestyleModel) => void
}) => {
  const [habit, setHabit] = useState<LifestyleModel>(habitProp);

  const handleChange = (field: keyof LifestyleModel, value: any) => {
    const updatedHabit = { ...habit, [field]: value };
    setHabit(updatedHabit);
    updateCallback(updatedHabit);
  };

  const handleTextChange = (field: keyof LifestyleModel, value: any) => {
    const updatedHabit = { ...habit, [field]: value };
    setHabit(updatedHabit);
    updateCallback(updatedHabit);
  };

  return (
    <Paper style={{ padding: "1.5rem", borderRadius: "8px", backgroundColor: "#F3F5EA", border: "1px solid #ddd", height: "100%", display: "flex", flexDirection: "column" }}>
      <Stack spacing={3} sx={{ flexGrow: 1 }}>
        <TextField
          variant="standard"
          placeholder="Group Title (e.g. Students)"
          value={habit.title}
          onChange={(e) => handleTextChange("title", e.target.value)}
          InputProps={{ style: { fontSize: '1.5rem', fontWeight: 'bold' } }}
        />

        <TextField
          variant="outlined"
          fullWidth
          size="small"
          type="number"
          label="Target Demographic (Number of people)"
          value={habit.demographicSize || ""}
          onChange={(e) => handleTextChange("demographicSize", e.target.value === "" ? "" : Number(e.target.value))}
          InputProps={{ inputProps: { min: 0 } }}
        />

        <div>
          <Typography variant="subtitle2" gutterBottom>Sleep Hours per night: {habit.sleepHours} hours</Typography>
          <Slider value={habit.sleepHours} onChange={(e, val) => handleChange("sleepHours", val)} step={1} marks min={0} max={12} color="success" />
        </div>

        <div>
          <Typography variant="subtitle2" gutterBottom>Screen Time per day: {habit.screenTime} hours</Typography>
          <Slider value={habit.screenTime} onChange={(e, val) => handleChange("screenTime", val)} step={1} marks min={0} max={16} color="success" />
        </div>

        <FormControl fullWidth size="small">
          <InputLabel>Exercise Frequency</InputLabel>
          <Select value={habit.exerciseFrequency} label="Exercise Frequency" onChange={(e) => handleChange("exerciseFrequency", e.target.value)}>
            <MenuItem value="Never">Never</MenuItem>
            <MenuItem value="1-2x per week">1-2x per week</MenuItem>
            <MenuItem value="3+ per week">3+ per week</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Diet Quality</InputLabel>
          <Select value={habit.dietQuality} label="Diet Quality" onChange={(e) => handleChange("dietQuality", e.target.value)}>
            <MenuItem value="Poor">Poor</MenuItem>
            <MenuItem value="Average">Average</MenuItem>
            <MenuItem value="Good">Good</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Stack direction="row" justifyContent="flex-end" mt={3}>
        <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={deleteCallback}>
          Delete
        </Button>
      </Stack>
    </Paper>
  );
};

const PreferencesForm = (props: OnboardPageProps) => {
  const [habits, setHabits] = useState<{ id: string, data: LifestyleModel }[]>([]);
  const saveData = useCallback(() => {
    return habits.map(h => h.data);
  }, [habits]);

  useEffect(() => { props.registerSave(saveData); }, [props, saveData]);

  const handleAdd = () => {
		const newId = Date.now().toString();
    const newHabit: LifestyleModel = {
      title: "",
      sleepHours: 7,
      screenTime: 4,
      exerciseFrequency: "1-2x per week",
      dietQuality: "Average",
      demographicSize: ""
    };

    setHabits([...habits, { id: newId, data: newHabit }]);
  };

  const handleDelete = (idToRemove: string) => {
    setHabits((prev) => prev.filter((item) => item.id !== idToRemove));
  };

  const handleUpdate = (idToUpdate: string, updatedData: LifestyleModel) => {
    setHabits((prev) => prev.map(item => item.id === idToUpdate ? { ...item, data: updatedData } : item));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <Typography variant="h4" sx={{ marginTop: "1rem", textAlign: "center" }}>Lifestyle Habits</Typography>
      <Stack direction="row" justifyContent="flex-end" width="100%" mb={2}>
        <Button variant="outlined" color="success" startIcon={<AddIcon />} onClick={handleAdd}>Add Demographic</Button>
      </Stack>
      <Grid container spacing={3}>
        {habits.map((item) => (
          <Grid item xs={12} md={6} key={item.id}>
            <LifestyleCard
              habitId={item.id}
              habitProp={item.data}
              deleteCallback={() => handleDelete(item.id)}
              updateCallback={(data) => handleUpdate(item.id, data)}
            />
          </Grid>
        ))}
      </Grid>
    </div>
  );
};

export default PreferencesForm;
