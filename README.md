# Todo List — PHP + MySQL

A small, dependency-free PHP web app: a REST JSON API backed by MySQL, plus a
single-page frontend that consumes it.

> **A note on "latest framework":** this is built as plain, modern PHP (8.x,
> PDO, `.env` config) rather than on top of Laravel/Symfony. This sandbox's
> network is locked to a short allow-list of domains and doesn't include
> **packagist.org**, so `composer install` can't fetch a framework here. The
> code below follows the same structure a framework gives you — routing,
> models, config, `.env` — just hand-rolled, so it runs anywhere PHP + MySQL
> are available, no Composer required. If you *do* have Composer/internet on
> your own machine and want this ported to Laravel, say so and I'll do it.

## Requirements

- PHP 8.1+ with the `pdo_mysql` extension
- MySQL 5.7+ / 8.0+ (or MariaDB)

## Project structure

```
todo-app/
├── .env.example        # copy to .env and fill in your DB credentials
├── .htaccess            # Apache rewrite rules (front controller)
├── index.php             # router + REST API + serves the frontend
├── config/
│   ├── env.php           # tiny .env loader
│   └── database.php      # PDO connection
├── src/
│   └── Todo.php          # model: all DB queries live here
├── database/
│   └── schema.sql        # creates the DB, table, and seed rows
└── public/
    ├── index.html        # single-page frontend
    ├── style.css
    └── app.js            # calls the API with fetch()
```

## Setup

1. **Configure the database**

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:

   ```
   APP_DEBUG=false
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=todo_app
   DB_USERNAME=root
   DB_PASSWORD=your_password
   DB_CHARSET=utf8mb4
   ```

2. **Create the schema**

   ```bash
   mysql -u root -p < database/schema.sql
   ```

   This creates the `todo_app` database, the `todos` table, and 3 sample rows.

3. **Run it**

   Quickest way, using PHP's built-in server:

   ```bash
   php -S localhost:8000
   ```

   Then open **http://localhost:8000** — the todo app UI loads and talks to
   the API automatically.

   For production, point Apache/Nginx's document root at this folder. The
   included `.htaccess` handles Apache rewrites; for Nginx, route all
   requests to `index.php` (`try_files $uri $uri/ /index.php?$query_string;`).

## API reference

All endpoints return JSON. Base path: `/api/todos`.

| Method | Endpoint                | Description              | Body                                |
|--------|--------------------------|---------------------------|--------------------------------------|
| GET    | `/api/todos`             | List all todos            | –                                    |
| POST   | `/api/todos`             | Create a todo             | `{ "title": "...", "description": "..." }` |
| GET    | `/api/todos/{id}`        | Get one todo              | –                                    |
| PUT    | `/api/todos/{id}`        | Update a todo             | `{ "title": "...", "description": "...", "completed": true }` |
| PATCH  | `/api/todos/{id}/toggle` | Toggle completed on/off   | –                                    |
| DELETE | `/api/todos/{id}`        | Delete a todo             | –                                    |

`title` is required on create (422 if missing/blank). Unknown IDs return 404.
Server-side errors return 500, with the real message only shown when
`APP_DEBUG=true`.

Example:

```bash
curl -X POST http://localhost:8000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy milk","description":"2%"}'
```

## Troubleshooting: blank styling / nothing loads

If the page loads with no styling and no todos appear, it's almost always one
of these:

- **You opened `index.html` directly in the browser** (a `file://...` URL).
  This app has a live PHP + MySQL backend, so it must be run *through* PHP —
  either `php -S localhost:8000` or a proper Apache/Nginx vhost. Opening the
  HTML file directly can't run the API and will 404 on the CSS/JS too.
- **MySQL isn't running, the DB doesn't exist yet, or `.env` has the wrong
  credentials.** Set `APP_DEBUG=true` in `.env` and reload `/api/todos`
  directly in the browser — it'll show the real PDO error message.
- **The `pdo_mysql` PHP extension isn't installed.** Run `php -m | grep pdo`
  — if `pdo_mysql` isn't listed, install it (e.g. `sudo apt install
  php-mysql` on Debian/Ubuntu, or enable `extension=pdo_mysql` in `php.ini`
  on Windows/XAMPP) and restart your server.

The app auto-detects whether it's served from the domain root
(`http://localhost:8000/`) or a subfolder (`http://localhost/todo-app/`,
common with XAMPP/shared hosting) and adjusts all asset and API URLs
accordingly — you don't need to edit any paths either way.

## Notes

- All queries use PDO prepared statements (no SQL injection surface).
- CORS is open (`Access-Control-Allow-Origin: *`) so the API can be called
  from another frontend/origin if you split them later — tighten this for
  production.
- The frontend is vanilla HTML/CSS/JS — no build step needed.
- This was tested end-to-end (create/read/update/toggle/delete/404/validation)
  against a local MySQL instance before delivery.
