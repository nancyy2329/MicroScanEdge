import api from "./client";

export async function createAnalysis(file: File) {
  const formData = new FormData();

  formData.append("image", file);
  formData.append("language", "en");
  formData.append("source", "web");

  const response = await api.post("/analysis", formData);

  return response.data;
}

export async function getHistory() {
  const response = await api.get("/history");
  return response.data;
}