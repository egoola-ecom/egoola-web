import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Backend addresses live in src/lib/endpoints.ts and nowhere else. The roots
// below are the real API roots, so a page link such as "/seller/orders" is not
// caught: the rule applies to the API client files only.
const API_ROOT = "^\\/(auth|public|accounts|catalog|bidding|engagement|geography|cms|orders|seller|buyer)\\/";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/lib/**/*.ts"],
    ignores: ["src/lib/endpoints.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=/${API_ROOT}/]`,
          message: "Write backend paths in src/lib/endpoints.ts and use ENDPOINTS here.",
        },
        {
          selector: `TemplateElement[value.raw=/${API_ROOT}/]`,
          message: "Write backend paths in src/lib/endpoints.ts and use ENDPOINTS here.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
