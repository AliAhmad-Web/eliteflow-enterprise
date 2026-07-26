import { prisma } from "@enterprise/database";

const perms = await prisma.permission.findMany({
  where: { key: { startsWith: "whiteboards" } },
});
console.log("perms", perms.map((p) => p.key));

const roles = await prisma.role.findMany({
  include: { rolePermissions: { include: { permission: true } } },
});

for (const r of roles) {
  const wb = r.rolePermissions
    .filter((rp) => rp.permission.key.startsWith("whiteboards"))
    .map((rp) => rp.permission.key);
  console.log(r.code, wb);
}

await prisma.$disconnect();
