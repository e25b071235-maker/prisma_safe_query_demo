import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seed() {
  await prisma.user.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.organization.deleteMany();

  const acme = await prisma.organization.create({
    data: { name: 'Acme Corp' },
  });
  const globex = await prisma.organization.create({
    data: { name: 'Globex Inc' },
  });

  const tsTag = await prisma.tag.create({ data: { slug: 'typescript' } });
  const prismaTag = await prisma.tag.create({ data: { slug: 'prisma' } });

  await prisma.user.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice@acme.dev',
      passwordHash: 'hashed_pw_alice',
      role: 'admin',
      status: 'active',
      age: 30,
      isVerified: true,
      orgId: acme.id,
      tags: { connect: [{ id: tsTag.id }, { id: prismaTag.id }] },
    },
  });

  await prisma.user.create({
    data: {
      name: 'Bob Smith',
      email: 'bob@acme.dev',
      passwordHash: 'hashed_pw_bob',
      role: 'user',
      status: 'pending',
      age: 22,
      isVerified: false,
      orgId: acme.id,
      tags: { connect: [{ id: prismaTag.id }] },
    },
  });

  await prisma.user.create({
    data: {
      name: 'Charlie Brown',
      email: 'charlie@acme.dev',
      passwordHash: 'hashed_pw_charlie',
      role: 'user',
      status: 'active',
      age: 41,
      isVerified: true,
      deletedAt: new Date('2025-01-01T00:00:00.000Z'),
      orgId: acme.id,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Diana Prince',
      email: 'diana@globex.dev',
      passwordHash: 'hashed_pw_diana',
      role: 'admin',
      status: 'active',
      age: 28,
      isVerified: true,
      orgId: globex.id,
      tags: { connect: [{ id: tsTag.id }] },
    },
  });

  return { acme, globex };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(({ acme, globex }) => {
      console.log('Seeded organizations:', acme.name, globex.name);
    })
    .finally(() => prisma.$disconnect());
}
