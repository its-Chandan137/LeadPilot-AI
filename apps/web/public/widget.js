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

  var apiUrl = (currentScript.getAttribute("data-api-url") || window.location.origin).replace(/\/$/, "");
  var widgetSrc = currentScript.getAttribute("data-widget-src") || apiUrl + "/widget-dist/widget.js";

  window.__LEADPILOT_CONFIG__ = {
    clientId: clientId,
    apiUrl: apiUrl
  };

  console.log("[LeadPilot] Config:", window.__LEADPILOT_CONFIG__);
  console.log("[LeadPilot] Loading widget from:", widgetSrc);

  function remount() {
    if (!window.LeadPilotWidget || typeof window.LeadPilotWidget.mount !== "function") {
      return;
    }

    var container = document.getElementById("leadpilot-widget-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "leadpilot-widget-container";
      document.body.appendChild(container);
    }

    var shadow = container.shadowRoot || container.attachShadow({ mode: "open" });
    window.LeadPilotWidget.mount({
      root: shadow,
      clientId: clientId,
      apiUrl: apiUrl
    });
  }

  // Already evaluated — remount with latest config (avoids re-declaring bundle bindings).
  if (window.LeadPilotWidget) {
    console.log("[LeadPilot] Widget already loaded — remounting");
    remount();
    return;
  }

  var existingBundle = document.querySelector('script[data-leadpilot-bundle="true"]');
  if (existingBundle) {
    existingBundle.addEventListener("load", remount);
    return;
  }

  var script = document.createElement("script");
  script.src = widgetSrc;
  script.async = true;
  script.setAttribute("data-leadpilot-bundle", "true");

  script.onload = function () {
    console.log("[LeadPilot] Widget loaded successfully");
  };

  script.onerror = function () {
    console.error("[LeadPilot] Error: Failed to load widget from " + widgetSrc);
  };

  document.head.appendChild(script);
})();
