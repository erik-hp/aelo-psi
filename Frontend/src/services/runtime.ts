// Synthetic data is available only during local development.
export const isApiMode = import.meta.env.MODE !== "test" && (import.meta.env.PROD || import.meta.env.VITE_USE_API === "true");
