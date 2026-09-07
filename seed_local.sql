-- Seed local dev org (no 'plan' column in actual schema)
INSERT INTO organizations (id, name, slug, status, timezone, locale, "createdAt", "updatedAt")
VALUES ('org-mukesh-local', 'Mukesh Home Lab', 'mukesh-home-lab', 'ACTIVE', 'UTC', 'en-US', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Link user as ADMIN member of org
INSERT INTO organization_members (id, "organizationId", "userId", role, "teamIds", "departmentIds", "isSuspended", "joinedAt", "updatedAt")
VALUES ('member-mukesh-001', 'org-mukesh-local', '7cbf8bba-7821-4629-93df-50ca0755ce6f', 'ADMIN', '{}', '{}', false, NOW(), NOW())
ON CONFLICT ("organizationId", "userId") DO NOTHING;

-- Insert registration key
-- Plain key: NOS-LOCA-LDEV-KEY0-2026
-- SHA256:    4ebc60fd7e8df1d25340a44c7147fc57f6f852a77913949cd0b8247bf54537e5
INSERT INTO registration_keys (
  id, "organizationId", "displayName", "keyHash", "keyPrefix", status,
  "maxUses", "currentUses", "allowedDepartments", "allowedTeams", "allowedGroups", "allowedTags",
  "createdBy", "totalGenerated", "failedAttempts", "devicesCreated", "createdAt", "updatedAt"
)
VALUES (
  'regkey-local-001',
  'org-mukesh-local',
  'Local Dev Agent Key',
  '4ebc60fd7e8df1d25340a44c7147fc57f6f852a77913949cd0b8247bf54537e5',
  'NOS-LOCA-LDEV****',
  'ACTIVE',
  0,
  0,
  '{}', '{}', '{}', '{}',
  '7cbf8bba-7821-4629-93df-50ca0755ce6f',
  1, 0, 0,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

SELECT id, name FROM organizations;
SELECT id, "keyPrefix", "displayName", status FROM registration_keys;
