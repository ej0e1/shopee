import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const tokens = await prisma.shopeeToken.findMany()
    console.log("Tokens:", JSON.stringify(tokens, null, 2))

    const products = await prisma.product.findMany({
        where: { isAutoBump: true },
        select: { id: true, shopeeItemId: true, name: true, shopId: true, isAutoBump: true }
    })
    console.log("Auto-Bump Products:", JSON.stringify(products, null, 2))

    const settings = await prisma.automationSetting.findMany()
    console.log("Settings:", JSON.stringify(settings, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
