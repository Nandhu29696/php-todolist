<?php

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/src/Todo.php';

// ---- Basic routing ----
// Works whether the app sits at the domain root (http://host/) or in a
// subfolder (http://host/todo-app/) — routes are matched relative to
// wherever this folder actually lives, not assumed to be "/".
// (We compare the real filesystem path against DOCUMENT_ROOT rather than
// trusting SCRIPT_NAME, since PHP's built-in dev server rewrites SCRIPT_NAME
// to match whatever static file was requested, which breaks detection.)
$docRoot  = realpath($_SERVER['DOCUMENT_ROOT'] ?? __DIR__) ?: __DIR__;
$appDir   = realpath(__DIR__) ?: __DIR__;
$basePath = str_replace('\\', '/', substr($appDir, strlen($docRoot)));
$basePath = rtrim($basePath, '/');
$uri      = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if ($basePath !== '' && str_starts_with($uri, $basePath)) {
    $uri = substr($uri, strlen($basePath));
}
$uri    = '/' . ltrim(rtrim($uri, '/'), '/');
$method = $_SERVER['REQUEST_METHOD'];

// Serve static frontend assets directly (css/js) when not behind Apache rewrite
if (preg_match('#^/public/(.+)$#', $uri, $m)) {
    $file = __DIR__ . '/public/' . $m[1];
    if (is_file($file)) {
        $mime = match (pathinfo($file, PATHINFO_EXTENSION)) {
            'css' => 'text/css',
            'js'  => 'application/javascript',
            default => 'text/plain',
        };
        header("Content-Type: $mime");
        readfile($file);
        exit;
    }
}

// Everything under /api is JSON
if (str_starts_with($uri, '/api')) {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');

    if ($method === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    $db   = get_db_connection();
    $todo = new Todo($db);

    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    try {
        // /api/todos/{id}/toggle
        if (preg_match('#^/api/todos/(\d+)/toggle$#', $uri, $m) && $method === 'PATCH') {
            $result = $todo->toggle((int) $m[1]);
            respond($result ? 200 : 404, $result ?? ['error' => 'Todo not found']);
        }

        // /api/todos/{id}
        if (preg_match('#^/api/todos/(\d+)$#', $uri, $m)) {
            $id = (int) $m[1];

            if ($method === 'GET') {
                $result = $todo->find($id);
                respond($result ? 200 : 404, $result ?? ['error' => 'Todo not found']);
            }

            if ($method === 'PUT' || $method === 'PATCH') {
                if (empty($input)) {
                    respond(400, ['error' => 'Request body must be valid JSON']);
                }
                $result = $todo->update($id, $input);
                respond($result ? 200 : 404, $result ?? ['error' => 'Todo not found']);
            }

            if ($method === 'DELETE') {
                $deleted = $todo->delete($id);
                respond($deleted ? 200 : 404, $deleted ? ['message' => 'Todo deleted'] : ['error' => 'Todo not found']);
            }
        }

        // /api/todos
        if ($uri === '/api/todos') {
            if ($method === 'GET') {
                respond(200, $todo->all());
            }

            if ($method === 'POST') {
                if (empty($input['title']) || trim($input['title']) === '') {
                    respond(422, ['error' => 'The title field is required']);
                }
                $result = $todo->create($input);
                respond(201, $result);
            }
        }

        respond(404, ['error' => 'Route not found']);
    } catch (Throwable $e) {
        respond(500, [
            'error'   => 'Server error',
            'message' => env('APP_DEBUG', 'false') === 'true' ? $e->getMessage() : 'Something went wrong.',
        ]);
    }
}

// ---- Fallback: serve the single-page frontend ----
// Inject the correct base path so asset/API links work from any subfolder.
header('Content-Type: text/html');
$html = file_get_contents(__DIR__ . '/public/index.html');
$html = str_replace('__BASE_PATH__', $basePath, $html);
echo $html;
exit;

function respond(int $status, $payload): void
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}
