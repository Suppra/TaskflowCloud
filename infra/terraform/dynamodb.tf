# ─────────────────────────────────────────────────────────────────────────────
# Tablas DynamoDB (PAY_PER_REQUEST) + GSIs
# Los nombres y los GSI deben coincidir con backend/src/repositories y lambdas.
# ─────────────────────────────────────────────────────────────────────────────

# ── Users ────────────────────────────────────────────────────────────────────
resource "aws_dynamodb_table" "users" {
  name         = local.dynamodb_tables.users
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }
  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  point_in_time_recovery { enabled = true }
  tags = { Name = local.dynamodb_tables.users }
}

# ── Projects ─────────────────────────────────────────────────────────────────
resource "aws_dynamodb_table" "projects" {
  name         = local.dynamodb_tables.projects
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "projectId"

  attribute {
    name = "projectId"
    type = "S"
  }
  attribute {
    name = "ownerId"
    type = "S"
  }

  global_secondary_index {
    name            = "ownerId-index"
    hash_key        = "ownerId"
    projection_type = "ALL"
  }

  point_in_time_recovery { enabled = true }
  tags = { Name = local.dynamodb_tables.projects }
}

# ── Boards ───────────────────────────────────────────────────────────────────
resource "aws_dynamodb_table" "boards" {
  name         = local.dynamodb_tables.boards
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "boardId"

  attribute {
    name = "boardId"
    type = "S"
  }
  attribute {
    name = "projectId"
    type = "S"
  }

  global_secondary_index {
    name            = "projectId-index"
    hash_key        = "projectId"
    projection_type = "ALL"
  }

  point_in_time_recovery { enabled = true }
  tags = { Name = local.dynamodb_tables.boards }
}

# ── Tasks ────────────────────────────────────────────────────────────────────
resource "aws_dynamodb_table" "tasks" {
  name         = local.dynamodb_tables.tasks
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "taskId"

  attribute {
    name = "taskId"
    type = "S"
  }
  attribute {
    name = "boardId"
    type = "S"
  }
  attribute {
    name = "projectId"
    type = "S"
  }

  global_secondary_index {
    name            = "boardId-index"
    hash_key        = "boardId"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "projectId-index"
    hash_key        = "projectId"
    projection_type = "ALL"
  }

  point_in_time_recovery { enabled = true }
  tags = { Name = local.dynamodb_tables.tasks }
}

# ── Notifications ────────────────────────────────────────────────────────────
resource "aws_dynamodb_table" "notifications" {
  name         = local.dynamodb_tables.notifications
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "notificationId"

  attribute {
    name = "notificationId"
    type = "S"
  }
  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name            = "userId-index"
    hash_key        = "userId"
    projection_type = "ALL"
  }

  tags = { Name = local.dynamodb_tables.notifications }
}

# ── Comments ─────────────────────────────────────────────────────────────────
resource "aws_dynamodb_table" "comments" {
  name         = local.dynamodb_tables.comments
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "commentId"

  attribute {
    name = "commentId"
    type = "S"
  }
  attribute {
    name = "taskId"
    type = "S"
  }

  global_secondary_index {
    name            = "taskId-index"
    hash_key        = "taskId"
    projection_type = "ALL"
  }

  tags = { Name = local.dynamodb_tables.comments }
}

# ── Alerts ───────────────────────────────────────────────────────────────────
resource "aws_dynamodb_table" "alerts" {
  name         = local.dynamodb_tables.alerts
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "alertId"

  attribute {
    name = "alertId"
    type = "S"
  }
  attribute {
    name = "projectId"
    type = "S"
  }

  global_secondary_index {
    name            = "projectId-index"
    hash_key        = "projectId"
    projection_type = "ALL"
  }

  tags = { Name = local.dynamodb_tables.alerts }
}

# ── Reports ──────────────────────────────────────────────────────────────────
resource "aws_dynamodb_table" "reports" {
  name         = local.dynamodb_tables.reports
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "reportId"

  attribute {
    name = "reportId"
    type = "S"
  }
  attribute {
    name = "projectId"
    type = "S"
  }

  global_secondary_index {
    name            = "projectId-index"
    hash_key        = "projectId"
    projection_type = "ALL"
  }

  tags = { Name = local.dynamodb_tables.reports }
}
