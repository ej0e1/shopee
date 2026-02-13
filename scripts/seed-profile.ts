import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    const profile = await prisma.userProfile.upsert({
        where: { id: "default_user" },
        update: {},
        create: {
            id: "default_user",
            name: "Ahmad Hassan",
            role: "Seller Pro",
        },
    })
    console.log("Seed complete:", profile)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
