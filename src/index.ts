import { ToggleCardTypeScript } from "./card";
import { ToggleCardTypeScriptEditor } from "./editor";

declare global {
  interface Window {
    customCards: Array<Object>;
  }
}

customElements.define("custom-thermostat", ToggleCardTypeScript);
customElements.define(
  "custom-thermostat-editor",
  ToggleCardTypeScriptEditor
);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "custom-thermostat",
  name: "Custom thermostat",
  description: "Card to config thermostat",
});
