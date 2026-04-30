# API Documentation - Focusly Project

Este documento detalla las APIs principales registradas en el proyecto Focusly, incluyendo tanto endpoints REST como consultas y mutaciones GraphQL.

---

## 1. User APIs (REST)

### `UserGet`
- **Nombre**: Get User Data
- **Método**: `GET`
- **Endpoint**: `/users/:id`
- **Descripción**: Obtiene la información detallada de un usuario específico por su ID.
- **Información Enviada (Props)**:
  - `id` (string): UUID del usuario.
- **Información Recibida (Response)**:
  - Un objeto `UserResponse` que contiene:
    - `id`: Identificador único.
    - `email`: Correo electrónico.
    - `authProvider`: Proveedor de autenticación (google, email, etc).
    - `subscriptionStatus`: Estado de la suscripción ('active' | 'inactive').
    - `settings`: Configuración del usuario (focusDurationPref, breakDurationPref, etc).
    - `createdAt`: Fecha de creación.
    - `lastSyncAt`: Fecha de última sincronización.

### `UserPost`
- **Nombre**: Create/Update User
- **Método**: `POST`
- **Endpoint**: `/users`
- **Descripción**: Crea un nuevo usuario o actualiza uno existente.
- **Información Enviada (Body)**:
  - Objeto `UserResponse` completo.
- **Información Recibida**:
  - El objeto `UserResponse` procesado.

---

## 2. Task APIs (GraphQL)

### `getTasksByUser`
- **Nombre**: Get Tasks By User
- **Tipo**: `Query`
- **Descripción**: Recupera todas las tareas asociadas a un usuario, permitiendo filtrar por estado o prioridad y ordenar los resultados.
- **Información Enviada (Arguments)**:
  - `userId`: `String!` (Requerido)
  - `filters`: `TaskFilterInput` (Opcional: status, priorityLevel, category)
  - `sort`: `TaskSortInput` (Opcional: field, direction)
- **Información Recibida (Resultado)**:
  - Un array de objetos `Task` con campos como:
    - `id`, `title`, `notes_encrypted`, `status`, `priority_level`, `category`, `deadline`.
    - `subtasks`: Lista de subtareas relacionadas.
    - `tags`: Etiquetas asociadas.
    - `workspace`: Información del workspace al que pertenece.

### `createTask`
- **Nombre**: Create Task
- **Tipo**: `Mutation`
- **Descripción**: Crea una nueva tarea en la plataforma.
- **Información Enviada (Arguments)**:
  - `createTaskInput`: Objeto que contiene el título, descripción, estado, id de usuario, prioridad, fecha límite y etiquetas.
- **Información Recibida**:
  - El objeto `Task` recién creado con su ID generado.

### `updateTask`
- **Nombre**: Update Task
- **Tipo**: `Mutation`
- **Descripción**: Actualiza los campos de una tarea existente.
- **Información Enviada (Arguments)**:
  - `updateTaskInput`: Objeto que debe incluir el `id` de la tarea y los campos opcionales a modificar.
- **Información Recibida**:
  - El objeto `Task` actualizado.

### `deleteTask`
- **Nombre**: Delete Task
- **Tipo**: `Mutation`
- **Descripción**: Elimina una tarea de forma permanente.
- **Información Enviada (Arguments)**:
  - `id`: `String!` (ID de la tarea a eliminar).
- **Información Recibida**:
  - `Boolean`: `true` si la operación fue exitosa.

### `addSubtask`
- **Nombre**: Add Subtask
- **Tipo**: `Mutation`
- **Descripción**: Añade una subtarea a una tarea padre existente.
- **Información Enviada (Arguments)**:
  - `taskId`: `String!` (ID de la tarea padre).
  - `subtask`: `SubtaskInput!` (Detalles de la subtarea).
- **Información Recibida**:
  - El objeto `Task` (padre) con la nueva lista de subtareas.

---

## 3. Workspace APIs (GraphQL)

### `workspaces`
- **Nombre**: Get Workspaces
- **Tipo**: `Query`
- **Descripción**: Obtiene la lista de workspaces del usuario autenticado.
- **Información Enviada (Arguments)**:
  - `search`: `String` (Opcional, para búsqueda por título).
  - `folderId`: `String` (Opcional, para filtrar por carpeta).
- **Información Recibida**:
  - Lista de objetos `Workspace` (id, title, content, folder, task, etc).

---

## 4. Tag APIs (GraphQL)

### `getTagsByUser`
- **Nombre**: Get User Tags
- **Tipo**: `Query`
- **Descripción**: Obtiene todas las etiquetas (tags) creadas por el usuario.
- **Información Enviada**: `userId` (String).
- **Información Recibida**: Lista de nombres de tags.
