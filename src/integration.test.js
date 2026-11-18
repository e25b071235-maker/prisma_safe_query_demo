import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { queryBuilder, parseQuery, QueryValidationError } from 'prisma-safe-query';
import { seed } from './seed.js';

const prisma = new PrismaClient();
let acmeOrg;

before(async () => {
  const { acme } = await seed();
  acmeOrg = acme;
});

after(async () => {
  await prisma.$disconnect();
});

test('basic filtering, sorting, search, and pagination against PostgreSQL', async () => {
  const { query, meta } = queryBuilder({
    status: 'active',
    age: { gte: '25' },
    isVerified: 'true',
    search: 'alice',
    sort: '-age,name',
    page: '1',
    limit: '10',
  })
    .baseWhere({ orgId: acmeOrg.id, deletedAt: null })
    .filter({
      status: { type: 'string', enum: ['active', 'pending', 'suspended'] },
      age: { type: 'number', operators: ['eq', 'gte', 'lte'] },
      isVerified: 'boolean',
    })
    .search(['name', 'email'])
    .sort(['name', 'age', 'createdAt'])
    .paginate({ defaultLimit: 10, maxLimit: 50 })
    .buildWithMeta();

  const [users, total] = await Promise.all([
    prisma.user.findMany(query),
    prisma.user.count({ where: query.where }),
  ]);

  assert.equal(total, 1);
  assert.equal(users.length, 1);
  assert.equal(users[0].email, 'alice@acme.dev');
  assert.deepEqual(meta, { page: 1, limit: 10, skip: 0 });
});

test('array shorthand filter + relation dot-path filtering + relation sort', async () => {
  const options = queryBuilder({
    role: 'admin',
    'org.name': { contains: 'Acme' },
    'tags.slug': 'typescript',
    sort: 'org.name:asc,-age',
  })
    .baseWhere({ deletedAt: null })
    .filter({
      role: 'string',
      'org.name': { type: 'string', insensitive: true },
      'tags.slug': { type: 'string', relation: 'some' },
    })
    .sort(['age', 'org.name'])
    .build();

  const users = await prisma.user.findMany(options);
  assert.equal(users.length, 1);
  assert.equal(users[0].name, 'Alice Johnson');

  // Array shorthand .filter(['status', 'role'])
  const arrayFilterOpts = parseQuery(
    { status: 'pending', role: 'user' },
    {
      baseWhere: { orgId: acmeOrg.id, deletedAt: null },
      filter: ['status', 'role'],
    }
  );
  const pendingUsers = await prisma.user.findMany(arrayFilterOpts);
  assert.equal(pendingUsers.length, 1);
  assert.equal(pendingUsers[0].name, 'Bob Smith');
});

test('security: baseWhere prevents tenant override and unallowed fields are ignored', async () => {
  const options = queryBuilder({
    orgId: 'attacker_org_id',
    passwordHash: 'hashed_pw_diana',
    limit: '5000',
  })
    .baseWhere({ orgId: acmeOrg.id, deletedAt: null })
    .filter({ status: 'string' })
    .paginate({ defaultLimit: 10, maxLimit: 25 })
    .build();

  assert.equal(options.take, 25);

  const users = await prisma.user.findMany(options);
  assert.equal(users.length, 2);
  assert.ok(users.every((u) => u.orgId === acmeOrg.id && u.deletedAt === null));
});

test('validation: invalid query parameters throw 400 QueryValidationError', () => {
  assert.throws(
    () =>
      queryBuilder({ age: { gte: 'not-a-number' } })
        .filter({ age: 'number' })
        .build(),
    (err) => err instanceof QueryValidationError && err.statusCode === 400 && err.code === 'INVALID_TYPE'
  );
});
