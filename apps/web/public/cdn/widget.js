(function () {
  var currentScript = document.currentScript;

  if (!currentScript) {
    return;
  }

  var clientId = currentScript.getAttribute("data-client-id");

  if (!clientId) {
    return;
  }

  var apiUrl = currentScript.getAttribute("data-api-url") || "http://localhost:3000";
  var widgetSrc = currentScript.getAttribute("data-widget-src");
  var scriptUrl = new URL(currentScript.getAttribute("src") || "", window.location.href);
  var bundleUrl = widgetSrc ? new URL(widgetSrc, scriptUrl).toString() : new URL("widget.bundle.js", scriptUrl).toString();
  var container = document.createElement("div");
  var shadowRoot = container.attachShadow({ mode: "open" });

  container.setAttribute("data-leadpilot-root", "");
  document.documentElement.appendChild(container);

  function mountWidget() {
    if (!window.LeadPilotWidget) {
      return;
    }

    window.LeadPilotWidget.mount({
      root: shadowRoot,
      clientId: clientId,
      apiUrl: apiUrl
    });
  }

  if (window.LeadPilotWidget) {
    mountWidget();
    return;
  }

  var bundleScript = document.createElement("script");
  bundleScript.async = true;
  bundleScript.src = bundleUrl;
  bundleScript.onload = mountWidget;
  document.head.appendChild(bundleScript);
})();
