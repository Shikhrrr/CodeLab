// ─── Central node role → technology configuration ─────────────────────────────
// Single source of truth for Sidebar palette, drop-handler defaults,
// and the NodePropertiesPanel tech dropdown.

export interface TechOption {
  name: string;
  port: number;
}

export interface RoleConfig {
  label: string;
  /** Sidebar / node header accent colour */
  color: string;
  techs: TechOption[];
}

/** Backend-canonical role literals as keys. */
export const NODE_ROLES: Record<string, RoleConfig> = {
  frontend: {
    label: 'Frontend',
    color: '#FCA5A5',
    techs: [
      { name: 'React',   port: 3000 },
      { name: 'Next.js', port: 3000 },
      { name: 'Vue',     port: 5173 },
      { name: 'Svelte',  port: 5173 },
      { name: 'Angular', port: 4200 },
    ],
  },
  backend: {
    label: 'Web Service',
    color: '#FFE814',
    techs: [
      { name: 'FastAPI', port: 8000 },
      { name: 'Django',  port: 8000 },
      { name: 'Express', port: 3000 },
      { name: 'NestJS',  port: 3000 },
      { name: 'Spring',  port: 8080 },
      { name: 'Rails',   port: 3000 },
      { name: 'Flask',   port: 5000 },
    ],
  },
  database: {
    label: 'Database',
    color: '#60EFFF',
    techs: [
      { name: 'PostgreSQL', port: 5432 },
      { name: 'MySQL',      port: 3306 },
      { name: 'MongoDB',    port: 27017 },
      { name: 'SQLite',     port: 0 },
      { name: 'CockroachDB',port: 26257 },
    ],
  },
  cache: {
    label: 'Cache',
    color: '#FF69B4',
    techs: [
      { name: 'Redis',     port: 6379 },
      { name: 'Memcached', port: 11211 },
      { name: 'Dragonfly', port: 6379 },
    ],
  },
  queue: {
    label: 'Message Queue',
    color: '#00F59B',
    techs: [
      { name: 'Kafka',     port: 9092 },
      { name: 'RabbitMQ',  port: 5672 },
      { name: 'SQS',       port: 0 },
      { name: 'NATS',      port: 4222 },
      { name: 'Pulsar',    port: 6650 },
    ],
  },
  gateway: {
    label: 'API Gateway',
    color: '#FF8C42',
    techs: [
      { name: 'Nginx',    port: 80 },
      { name: 'Traefik',  port: 80 },
      { name: 'Caddy',    port: 80 },
      { name: 'Kong',     port: 8000 },
      { name: 'Envoy',    port: 10000 },
    ],
  },
  worker: {
    label: 'Worker',
    color: '#C084FC',
    techs: [
      { name: 'Celery',      port: 0 },
      { name: 'RQ',          port: 0 },
      { name: 'BullMQ',      port: 0 },
      { name: 'Temporal',    port: 7233 },
      { name: 'Prefect',     port: 4200 },
    ],
  },
};

/** Ordered list of role keys for sidebar rendering. */
export const ROLE_ORDER: string[] = [
  'backend',
  'frontend',
  'database',
  'cache',
  'queue',
  'gateway',
  'worker',
];

/** Returns the first tech option for a given role (used as drop default). */
export function defaultTechForRole(role: string): TechOption {
  return NODE_ROLES[role]?.techs[0] ?? { name: 'Custom', port: 0 };
}
