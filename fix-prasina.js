const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const PRASINA = '8b1076fd-64f9-41b5-affd-36550457233b';

async function run() {
  // Boost Prasina's goals to push from A (93) → A+ (≥95)
  // The API keeps CRI and III active (unlike test script), so we need more headroom

  const goals = await p.goal.findMany({
    where: { ownerId: PRASINA, deletedAt: null, status: { in: ['ACTIVE', 'COMPLETED'] } },
    select: { id: true, title: true, progress: true, status: true, dueDate: true },
  });
  console.log('Current Prasina goals:');
  goals.forEach(g => console.log(`  ${g.title} | progress=${g.progress} status=${g.status} dueDate=${g.dueDate}`));

  // Boost: completed goal 80→90, active goal 70→82
  for (const g of goals) {
    if (g.title.includes('Performance Review')) {
      await p.goal.update({ where: { id: g.id }, data: { progress: 90 } });
      console.log(`\nUpdated "${g.title}" → progress=90`);
    }
    if (g.title.includes('Skill Gap')) {
      await p.goal.update({ where: { id: g.id }, data: { progress: 82 } });
      console.log(`Updated "${g.title}" → progress=82`);
    }
  }

  console.log('\nDone — refresh dashboard to verify A+ grade');
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
