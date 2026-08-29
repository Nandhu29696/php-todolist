<?php

class Todo
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function all(): array
    {
        $stmt = $this->db->query('SELECT * FROM todos ORDER BY created_at DESC');
        return $stmt->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM todos WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $data): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO todos (title, description, completed) VALUES (:title, :description, :completed)'
        );
        $stmt->execute([
            'title'       => $data['title'],
            'description' => $data['description'] ?? null,
            'completed'   => !empty($data['completed']) ? 1 : 0,
        ]);

        return $this->find((int) $this->db->lastInsertId());
    }

    public function update(int $id, array $data): ?array
    {
        $existing = $this->find($id);
        if (!$existing) {
            return null;
        }

        $stmt = $this->db->prepare(
            'UPDATE todos SET title = :title, description = :description, completed = :completed WHERE id = :id'
        );
        $stmt->execute([
            'title'       => $data['title'] ?? $existing['title'],
            'description' => array_key_exists('description', $data) ? $data['description'] : $existing['description'],
            'completed'   => array_key_exists('completed', $data) ? (!empty($data['completed']) ? 1 : 0) : $existing['completed'],
            'id'          => $id,
        ]);

        return $this->find($id);
    }

    public function toggle(int $id): ?array
    {
        $existing = $this->find($id);
        if (!$existing) {
            return null;
        }

        $newState = $existing['completed'] ? 0 : 1;
        $stmt = $this->db->prepare('UPDATE todos SET completed = :completed WHERE id = :id');
        $stmt->execute(['completed' => $newState, 'id' => $id]);

        return $this->find($id);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare('DELETE FROM todos WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->rowCount() > 0;
    }
}
