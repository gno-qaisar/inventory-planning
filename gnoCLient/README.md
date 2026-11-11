# Panda Planner Inventory Forecasting

A React and TypeScript inventory planning workspace for Amazon sales history and current inventory CSV exports.

## Forecast and inventory rules

- Forecast months use the exact prior-year calendar month from sales history. When no sales row exists for that month, the SKU's fallback value is used.
- A manual forecast override for a specific month takes precedence over historical lookup and fallback values.
- Starting stock is the sum of FBA active, FBA reserved, FBA inbound, AWD, and warehouse inventory.
- Current FBA inbound inventory is included in starting stock and is not counted again as a future M1 receipt.
- The landing offset is rounded from lead time days: `leadTimeDays / 30` months.
- Purchase orders entered manually are landed after the selected lead-time offset.
- When automatic planning is needed, the engine adds replenishment orders so projected inventory at the lead-time landing month is at least `average forecast × buffer months`.
- End-of-month stock is calculated as prior stock plus landing receipts minus forecast demand.

## Run locally

```bash
npm install
npm run dev
```

Other commands:

```bash
npm run build
npm run lint
```

## CSV inputs

Upload one sales-history CSV and one current-inventory CSV. See the sample files under `public/samples/` for expected columns and values.

---

## Vite template notes

This template uses React and TypeScript with Vite.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
