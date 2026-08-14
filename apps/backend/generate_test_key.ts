import { NestFactory } from "@nestjs/core";
import { AppModule } from "./src/app.module";
import { RegistrationKeyService } from "./src/modules/fleet/services/registration-key.service";
import { PrismaService } from "./src/common/prisma/prisma.service";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const keyService = app.get(RegistrationKeyService);

  const org = await prisma.organization.findFirst();
  const user = await prisma.user.findFirst();

  if (!org || !user) {
    console.log("No organization or user found.");
    await app.close();
    return;
  }

  const result = await keyService.generateKey({
    organizationId: org.id,
    createdByUserId: user.id,
    displayName: "E2E Test Key",
    maxUses: 10,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  });

  console.log("--- GENERATED REGISTRATION KEY ---");
  console.log(result.key);
  console.log("----------------------------------");

  await app.close();
}

bootstrap().catch(console.error);
