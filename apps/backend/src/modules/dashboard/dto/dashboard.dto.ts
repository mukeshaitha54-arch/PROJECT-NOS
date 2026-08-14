import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class DashboardDevicesQueryDto {
  @ApiPropertyOptional({ default: 1, description: "Page number (1-indexed)" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    default: 20,
    description: "Number of device records per page",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: "Search term for hostname, device UUID, or OS",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      "Filter by device status (ONLINE, OFFLINE, CRITICAL, WARNING, DEGRADED, ALL)",
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "Filter by operating system substring" })
  @IsOptional()
  @IsString()
  os?: string;
}

export class DashboardHistoryQueryDto {
  @ApiPropertyOptional({
    description: "Start timestamp in ISO 8601 UTC format",
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: "End timestamp in ISO 8601 UTC format" })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ default: 1, description: "Page number (1-indexed)" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    default: 50,
    description: "Number of snapshots per page (max 200)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
