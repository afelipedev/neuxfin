import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Catálogo de skills de terceiros (não é código do app)
    ".agent/**",
  ]),
  {
    // Componentes gerados pelo shadcn/ui: não editar à mão (ex.: Math.random no skeleton do sidebar)
    files: ["src/components/ui/**"],
    rules: { "react-hooks/purity": "off" },
  },
]);

export default eslintConfig;
