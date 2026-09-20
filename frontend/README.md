# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.


## Google Maps land boundary

The registration form now supports:

- **Length and width** in metres.
- Interactive **Google satellite map**.
- Click-to-mark **land boundary polygon**.
- Automatic **area calculation** in m² and acres.
- Stored **GPS coordinates** and boundary metadata.
- Registered boundaries are shown again in **Verify Property**.

### Environment variable

Create a frontend environment variable:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

Enable the **Maps JavaScript API** in Google Cloud and restrict the key to the deployed frontend domain.

The boundary metadata is stored by the LandChain backend. The blockchain continues to store the ownership/document record; the map coordinates are kept off-chain to avoid putting large coordinate arrays into Ethereum transactions.

The map is a visualization and is **not a substitute for an official cadastral survey or legal land boundary**.
