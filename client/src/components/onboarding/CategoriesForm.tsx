import React, { useCallback, useEffect, useState } from "react";
import { OnboardPageProps } from "../../models/OnboardPageProps";
import { Grid, Button, Stack, Typography, Paper, TextField, Slider, FormControl, InputLabel, Select, MenuItem, Autocomplete, Chip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

export interface SocialCategoryModel {
  title: string;
  interactionScore: number;
  workHours: number;
  peerInfluence: string;
  demographicSize: number | "";
  riskTags: string[];
}

const CategoryCard = ({
  catId,
  categoryProp,
  deleteCallback,
  updateCallback
}: {
  catId: string,
  categoryProp: SocialCategoryModel,
  deleteCallback: () => void,
  updateCallback: (data: SocialCategoryModel) => void
}) => {
  const [category, setCategory] = useState<SocialCategoryModel>(categoryProp);

  const handleChange = (field: keyof SocialCategoryModel, value: any) => {
    const updatedCat = { ...category, [field]: value };
    setCategory(updatedCat);
    updateCallback(updatedCat);
  };

  const handleTextChange = (field: keyof SocialCategoryModel, value: any) => {
    const updatedCat = { ...category, [field]: value };
    setCategory(updatedCat);
    updateCallback(updatedCat);
  };

  return (
    <Paper style={{ padding: "1.5rem", borderRadius: "8px", backgroundColor: "#F3F5EA", border: "1px solid #ddd", height: "100%", display: "flex", flexDirection: "column" }}>
      <Stack spacing={3} sx={{ flexGrow: 1 }}>
        <TextField
          variant="standard"
          placeholder="Group Title (e.g. Factory Workers)"
          value={category.title}
          onChange={(e) => handleTextChange("title", e.target.value)}
          InputProps={{ style: { fontSize: '1.5rem', fontWeight: 'bold' } }}
        />

        <TextField
          variant="outlined"
          fullWidth
          size="small"
          type="number"
          label="Target Demographic (Number of people)"
          value={category.demographicSize || ""}
          onChange={(e) => handleTextChange("demographicSize", e.target.value === "" ? "" : Number(e.target.value))}
          InputProps={{ inputProps: { min: 0 } }}
        />

        <div>
          <Typography variant="subtitle2" gutterBottom>Social Interaction Score (1-10): {category.interactionScore}</Typography>
          <Slider value={category.interactionScore} onChange={(e, val) => handleChange("interactionScore", val)} step={1} marks min={1} max={10} color="secondary" />
        </div>

        <div>
          <Typography variant="subtitle2" gutterBottom>Work Hours per week: {category.workHours}</Typography>
          <Slider value={category.workHours} onChange={(e, val) => handleChange("workHours", val)} step={5} marks min={0} max={80} color="secondary" />
        </div>

        <FormControl fullWidth size="small">
          <InputLabel>Peer Influence Level</InputLabel>
          <Select value={category.peerInfluence} label="Peer Influence Level" onChange={(e) => handleChange("peerInfluence", e.target.value)}>
            <MenuItem value="Low">Low</MenuItem>
            <MenuItem value="Moderate">Moderate</MenuItem>
            <MenuItem value="High">High</MenuItem>
          </Select>
        </FormControl>

        <Autocomplete
          multiple
          freeSolo
          fullWidth
          options={[]}
          value={category.riskTags || []}
          onChange={(e, newValue) => handleChange("riskTags", newValue)}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip variant="outlined" color="error" label={option} size="small" {...getTagProps({ index })} />
            ))
          }
          renderInput={(params) => (
            <TextField {...params} variant="outlined" size="small" label="Add Risk Tags (Press Enter)" placeholder="e.g. Isolation" />
          )}
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

const CategoriesForm = (props: OnboardPageProps) => {
  const [categories, setCategories] = useState<{ id: string, category: SocialCategoryModel }[]>([]);
  const saveData = useCallback(() => {
    return categories.map(c => c.category);
  }, [categories]);

  useEffect(() => { props.registerSave(saveData); }, [props, saveData]);

  const handleAddNewCategory = () => {
    const newId = Date.now().toString();
    const newCategory: SocialCategoryModel = {
      title: "",
      interactionScore: 5,
      workHours: 40,
      peerInfluence: "Moderate",
      demographicSize: "",
      riskTags: []
    };

    setCategories([...categories, { id: newId, category: newCategory }]);
  };

  const handleDeleteCategory = (idToRemove: string) => {
    setCategories((prev) => prev.filter((item) => item.id !== idToRemove));
  };

  const handleUpdate = (idToUpdate: string, updatedData: SocialCategoryModel) => {
    setCategories((prev) => prev.map(item => item.id === idToUpdate ? { ...item, category: updatedData } : item));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <Typography variant="h4" sx={{ marginTop: "1rem", textAlign: "center" }}>
        Social & Behavioral Indicators
      </Typography>
      <Stack direction={"row"} justifyContent={"flex-end"} width={"100%"} mb={2}>
        <Button variant="outlined" color="secondary" startIcon={<AddIcon />} onClick={handleAddNewCategory}>
          Add Demographic
        </Button>
      </Stack>

      <Grid container spacing={3}>
        {categories.map((item) => (
          <Grid item xs={12} md={6} key={item.id}>
            <CategoryCard
              catId={item.id}
              categoryProp={item.category}
              deleteCallback={() => handleDeleteCategory(item.id)}
              updateCallback={(data) => handleUpdate(item.id, data)}
            />
          </Grid>
        ))}
      </Grid>
    </div>
  );
};

export default CategoriesForm;
