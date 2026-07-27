const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const a = await prisma.attendance.findFirst();
    console.log('Success:', a);
  } catch (e) {
    console.error('Error:', e);
  }
}
main();
