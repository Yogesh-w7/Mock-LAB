import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        paper: "#f6f8fc",
        brand: "#3157d5",
      },
    },
  },
  plugins: [],
};
export default config;
