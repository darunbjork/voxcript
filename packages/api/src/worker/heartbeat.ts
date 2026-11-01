import { prisma } from '../db/prisma.js'

export async function beat(workerId: string, version: string): Promise<void> {
  await prisma.workerHeartbeat.upsert({
    where: { workerId },
    create: { workerId, beatAt: new Date(), version },
    update: { beatAt: new Date(), version },
  })
}
