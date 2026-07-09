(function () {
  "use strict";

  var currentScript = document.currentScript;

  if (!currentScript) {
    console.error("[LeadPilot] No currentScript found — loader cannot initialize.");
    return;
  }

  console.log("[LeadPilot] Loader initialized");

  var clientId = currentScript.getAttribute("data-client-id");

  if (!clientId) {
    console.error("[LeadPilot] Missing data-client-id attribute — aborting.");
    return;
  }

  var apiUrl = currentScript.getAttribute("data-api-url") || window.location.origin;
  var widgetSrc = currentScript.getAttribute("data-widget-src") || apiUrl + "/widget-dist/widget.js";

  var config = {
    clientId: clientId,
    apiUrl: apiUrl
  };

  console.log("[LeadPilot] Config:", config);
  console.log("[LeadPilot] Loading widget from:", widgetSrc);

  window.__LEADPILOT_CONFIG__ = config;

  var container = document.createElement("div");
  container.id = "leadpilot-widget-container";
  document.body.appendChild(container);

  var script = document.createElement("script");
  script.src = widgetSrc;
  script.async = true;

  script.onload = function () {
    console.log("[LeadPilot] Widget loaded successfully");
  };

  script.onerror = function () {
    console.error("[LeadPilot] Error: Failed to load widget from " + widgetSrc);
  };

  document.head.appendChild(script);
})();
