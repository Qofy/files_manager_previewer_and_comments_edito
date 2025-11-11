<!-- <script>
      // A very simple Mithril app that displays the server health and a welcome message.
      const App = {
        health: "",
        oninit: function () {
          m.request({ method: "GET", url: "/health" })
            .then((res) => {
              this.health = res;
            })
            .catch((err) => {
              this.health = "Error: " + err.message;
            });
        },
        view: function () {
          return [
            m("h1", "Quote & Invoice Maker"),
            m("p", "Server health: " + (this.health || "pending")),
            m(
              "p",
              "Welcome! This is a minimal front‑end built with Mithril.js. Use your own client or extend this app to call the API endpoints for managing profiles, clients, quotes and invoices."
            ),
            m("p", [
              "For API documentation, run the CLI command ",
              m("code", "list-routes"),
              ".",
            ]),
          ];
        },
      };
      m.mount(document.getElementById("app"), App);
    </script>

    <div id="app" class="container"></div>
    

    <style>
      .container {
        max-width: 800px;
        margin: 0 auto;
      }
    </style>

    
 -->
