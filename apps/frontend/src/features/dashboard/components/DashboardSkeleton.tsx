import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SystemStatus } from "@nos/shared-types";

export function DashboardSkeleton() {
  const defaultStatus: SystemStatus = SystemStatus.HEALTHY;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="border-emerald-500/20 bg-emerald-950/10 hover:border-emerald-500/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-emerald-400">
            <span>Fastify API Status</span>
            <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 font-mono">
              {defaultStatus}
            </span>
          </CardTitle>
          <CardDescription>NestJS + Fastify backend connectivity</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Production-grade REST endpoints protected with Helmet, Pino structured logging, rate limiting, and correlation IDs.
          </p>
          <Button variant="outline" size="sm" className="w-full text-xs">
            Test Ping Endpoint
          </Button>
        </CardContent>
      </Card>

      <Card className="border-blue-500/20 bg-blue-950/10 hover:border-blue-500/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-blue-400">Telemetry Nodes</CardTitle>
          <CardDescription>.NET Monitoring Agent Integration</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Background worker service ready for device instrumentation, hardware diagnostic gathering, and asynchronous streaming.
          </p>
          <Button variant="outline" size="sm" className="w-full text-xs">
            View Node Registry (Placeholder)
          </Button>
        </CardContent>
      </Card>

      <Card className="border-purple-500/20 bg-purple-950/10 hover:border-purple-500/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-purple-400">Database & Caching</CardTitle>
          <CardDescription>PostgreSQL + PgAdmin + Redis</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Prisma ORM schema baseline prepared for high-throughput metrics storage, accompanied by prepared Redis containers.
          </p>
          <Button variant="outline" size="sm" className="w-full text-xs">
            Open PgAdmin Console
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
