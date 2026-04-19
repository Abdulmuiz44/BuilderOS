import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 3000);

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Builder OS Dashboard</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      }
      body {
        margin: 0;
        background: linear-gradient(160deg, #f7f7f5, #efede7);
        color: #151515;
      }
      .container {
        max-width: 920px;
        margin: 0 auto;
        padding: 48px 20px;
      }
      .card {
        background: #fff;
        border: 1px solid #d8d2c3;
        border-radius: 12px;
        padding: 20px;
        margin-top: 16px;
      }
      h1 {
        margin: 0;
        font-size: 40px;
      }
      p {
        line-height: 1.6;
      }
      code {
        background: #f1ede3;
        padding: 2px 6px;
        border-radius: 6px;
      }
    </style>
  </head>
  <body>
    <main class="container">
      <h1>Builder OS Dashboard</h1>
      <p>Web app foundation is running. This dashboard will host API key management, usage visibility, and workflow operations.</p>
      <div class="card">
        <strong>Current foundation state</strong>
        <p>- Dashboard shell is live.<br/>- Gateway + CLI are scaffolded.<br/>- Next milestone: auth UX and usage pages.</p>
      </div>
    </main>
  </body>
</html>`;

const server = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
});

server.listen(port, () => {
  console.log(`Builder OS Web listening on http://localhost:${port}`);
});
