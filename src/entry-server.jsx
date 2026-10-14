import React from "react";
import { renderToString } from "react-dom/server";
import App from "./App.jsx";

export function render(path, data) {
  return renderToString(<App initialPath={path} initialData={data} />);
}
