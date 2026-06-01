/**
 * init-dynamodb.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Crea todas las tablas DynamoDB necesarias en DynamoDB Local.
 * Ejecutar UNA VEZ después de levantar el contenedor de DynamoDB Local:
 *
 *   node scripts/init-dynamodb.js
 *
 * Requiere que DynamoDB Local esté corriendo en http://localhost:8000
 * (docker-compose up dynamodb-local  o  docker-compose up -d)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { DynamoDBClient, CreateTableCommand, ListTablesCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});

/** Helper: crea una tabla, ignora si ya existe */
async function createTable(params) {
  try {
    await client.send(new CreateTableCommand(params));
    console.log(`  ✅  ${params.TableName}`);
  } catch (err) {
    if (err.name === 'ResourceInUseException') {
      console.log(`  ⏭   ${params.TableName} (ya existe)`);
    } else {
      throw err;
    }
  }
}

/** Configuración de billing on-demand para todas las tablas (equivale a PAY_PER_REQUEST) */
const billing = { BillingMode: 'PAY_PER_REQUEST' };

const tables = [
  // ── taskflow-users ─────────────────────────────────────────────────────────
  {
    TableName: 'taskflow-users',
    KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'email',  AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'email-index',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    ...billing,
  },

  // ── taskflow-projects ──────────────────────────────────────────────────────
  {
    TableName: 'taskflow-projects',
    KeySchema: [{ AttributeName: 'projectId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'projectId', AttributeType: 'S' },
      { AttributeName: 'ownerId',   AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'ownerId-index',
        KeySchema: [{ AttributeName: 'ownerId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    ...billing,
  },

  // ── taskflow-boards ────────────────────────────────────────────────────────
  {
    TableName: 'taskflow-boards',
    KeySchema: [{ AttributeName: 'boardId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'boardId',   AttributeType: 'S' },
      { AttributeName: 'projectId', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'projectId-index',
        KeySchema: [{ AttributeName: 'projectId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    ...billing,
  },

  // ── taskflow-tasks ─────────────────────────────────────────────────────────
  {
    TableName: 'taskflow-tasks',
    KeySchema: [{ AttributeName: 'taskId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'taskId',    AttributeType: 'S' },
      { AttributeName: 'boardId',   AttributeType: 'S' },
      { AttributeName: 'projectId', AttributeType: 'S' },
      { AttributeName: 'dueDate',   AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'boardId-index',
        KeySchema: [{ AttributeName: 'boardId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'projectId-index',
        KeySchema: [{ AttributeName: 'projectId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        // Usado por la Lambda overdue-tasks para detectar fechas vencidas eficientemente
        IndexName: 'dueDate-index',
        KeySchema: [{ AttributeName: 'dueDate', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'KEYS_ONLY' },
      },
    ],
    ...billing,
  },

  // ── taskflow-comments ──────────────────────────────────────────────────────
  {
    TableName: 'taskflow-comments',
    KeySchema: [{ AttributeName: 'commentId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'commentId', AttributeType: 'S' },
      { AttributeName: 'taskId',    AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'taskId-index',
        KeySchema: [{ AttributeName: 'taskId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    ...billing,
  },

  // ── taskflow-notifications ─────────────────────────────────────────────────
  {
    TableName: 'taskflow-notifications',
    KeySchema: [{ AttributeName: 'notificationId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'notificationId', AttributeType: 'S' },
      { AttributeName: 'userId',         AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'userId-index',
        KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    ...billing,
  },

  // ── taskflow-reports ───────────────────────────────────────────────────────
  {
    TableName: 'taskflow-reports',
    KeySchema: [{ AttributeName: 'reportId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'reportId',  AttributeType: 'S' },
      { AttributeName: 'projectId', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'projectId-index',
        KeySchema: [{ AttributeName: 'projectId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    ...billing,
  },

  // ── taskflow-alerts ────────────────────────────────────────────────────────
  {
    TableName: 'taskflow-alerts',
    KeySchema: [{ AttributeName: 'alertId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'alertId',   AttributeType: 'S' },
      { AttributeName: 'projectId', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'projectId-index',
        KeySchema: [{ AttributeName: 'projectId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    ...billing,
  },
];

async function main() {
  console.log('\n🗄️  TaskFlow Cloud — Inicializando tablas DynamoDB Local\n');

  // Verificar que DynamoDB Local está disponible
  try {
    await client.send(new ListTablesCommand({}));
  } catch {
    console.error('❌ No se puede conectar a DynamoDB Local en http://localhost:8000');
    console.error('   Asegúrate de que el contenedor está corriendo:');
    console.error('   docker-compose up -d dynamodb-local\n');
    process.exit(1);
  }

  for (const table of tables) {
    await createTable(table);
  }

  console.log('\n✅  Todas las tablas listas.\n');
  console.log('📋  Tablas creadas:');
  const result = await client.send(new ListTablesCommand({}));
  (result.TableNames ?? []).forEach(t => console.log(`     - ${t}`));
  console.log();
}

main().catch(err => {
  console.error('❌ Error inesperado:', err.message);
  process.exit(1);
});
