# LinkSnap URL Shortener

[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?style=flat-square&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![ASP.NET Core](https://img.shields.io/badge/ASP.NET%20Core-Razor%20Pages-512BD4?style=flat-square&logo=dotnet&logoColor=white)](https://learn.microsoft.com/aspnet/core/)
[![SQLite](https://img.shields.io/badge/SQLite-Local%20Storage-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![Render](https://img.shields.io/badge/Render-Deployable-46E3B7?style=flat-square&logo=render&logoColor=black)](https://render.com/)

LinkSnap is an ASP.NET Core URL shortener that turns long URLs into short, shareable links. It includes a Razor Pages frontend, custom aliases, recent-link history, SQLite persistence, Docker support, and Render deployment configuration.

## Features

- Shorten any valid `http` or `https` URL.
- Optional custom aliases using letters, numbers, `_`, and `-`.
- Redirect short codes back to the original URL.
- Show recent shortened links.
- Copy generated links from the browser.
- Generate a simple QR-style canvas preview for a short link.
- Store link mappings in SQLite.
- Run locally with `dotnet run`.
- Deploy as a Docker web service on Render.

## Tech Stack

- .NET 10
- ASP.NET Core Razor Pages
- Minimal APIs
- Microsoft.Data.Sqlite
- HTML, CSS, JavaScript
- Docker
- Render Blueprint

## Project Structure

```text
.
|-- Models/
|   `-- UrlMapping.cs
|-- Pages/
|   |-- Index.cshtml
|   `-- Shared/
|-- Services/
|   `-- UrlService.cs
|-- wwwroot/
|   |-- css/
|   `-- js/
|-- Program.cs
|-- webapp.csproj
|-- Dockerfile
|-- render.yaml
`-- appsettings.json
```

## API Routes

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/` | Opens the LinkSnap homepage. |
| `POST` | `/shorten` | Creates a short link. |
| `GET` | `/api/links/recent` | Returns the 5 most recent links. |
| `GET` | `/{code}` | Redirects a short code to the original URL. |
| `GET` | `/health` | Health check endpoint for deployment platforms. |

Example request:

```bash
curl -X POST http://localhost:8080/shorten \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://example.com\",\"alias\":\"demo-link\"}"
```

Example response:

```json
{
  "shortUrl": "http://localhost:8080/demo-link",
  "shortCode": "demo-link"
}
```

## Getting Started

### Prerequisites

- .NET 10 SDK
- Git
- Docker, optional

### Run Locally

Clone the repository:

```bash
git clone https://github.com/ALLLENX/Url-shortner-.git
cd Url-shortner-
```

Restore dependencies:

```bash
dotnet restore
```

Run the app:

```bash
dotnet run
```

Open the local URL shown in the terminal. The app uses SQLite and creates the local database at:

```text
Data/links.db
```

### Build

```bash
dotnet build
```

### Publish

```bash
dotnet publish -c Release
```

## Docker

Build the image:

```bash
docker build -t linksnap-url-shortener .
```

Run the container:

```bash
docker run -p 8080:8080 linksnap-url-shortener
```

Open:

```text
http://localhost:8080
```

## Deployment On Render

This project includes `render.yaml`, so the easiest deployment path is Render Blueprint.

1. Push the latest code to GitHub.
2. In Render, choose **New > Blueprint**.
3. Connect this repository.
4. Select the `main` branch.
5. Apply the blueprint.

The blueprint configures:

- Docker runtime.
- `/health` health check.
- SQLite connection string pointing to `/app/Data/links.db`.
- Persistent disk mounted at `/app/Data`.

Important: SQLite data needs persistent storage in production. Without the Render disk, shortened links can be lost after restart or redeploy.

## Configuration

Default local connection string:

```json
{
  "ConnectionStrings": {
    "UrlShortener": "Data Source=Data/links.db"
  }
}
```

Render overrides this with:

```text
ConnectionStrings__UrlShortener=Data Source=/app/Data/links.db
```

## Notes

- This is a server-rendered ASP.NET Core app, so it should be deployed to a server/container host such as Render.
- It is not a static site and is not a good fit for GitHub Pages or Vercel static hosting.
- The `bin`, `obj`, local SQLite database, and IDE files are intentionally ignored by Git.

## License

No license file is currently included.
