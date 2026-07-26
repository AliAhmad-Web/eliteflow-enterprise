import { prisma } from "@enterprise/database";

const keys = [
  {
    key: "whiteboards:read",
    resource: "whiteboards",
    action: "read",
    description: "View whiteboards and canvas content",
  },
  {
    key: "whiteboards:write",
    resource: "whiteboards",
    action: "write",
    description: "Create, update, duplicate, and rename whiteboards",
  },
  {
    key: "whiteboards:delete",
    resource: "whiteboards",
    action: "delete",
    description: "Delete whiteboards",
  },
];

const permIds = {};

for (const p of keys) {
  const row = await prisma.permission.upsert({
    where: { key: p.key },
    update: {
      resource: p.resource,
      action: p.action,
      description: p.description,
    },
    create: p,
  });
  permIds[p.key] = row.id;
  console.log("perm", p.key);
}

const roles = await prisma.role.findMany({
  where: { code: { in: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE", "CLIENT"] } },
});

for (const role of roles) {
  const grant =
    role.code === "CLIENT"
      ? ["whiteboards:read"]
      : Object.keys(permIds);

  for (const key of grant) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permIds[key],
        },
      },
      update: {},
      create: {
        roleId: role.id,
        permissionId: permIds[key],
      },
    });
  }
  console.log("role", role.code, grant.join(","));
}

await prisma.$disconnect();
