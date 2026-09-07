INSERT INTO registration_keys (id, "organizationId", "displayName", "keyHash", "keyPrefix", status, "maxUses", "currentUses", "allowedDepartments", "allowedTeams", "allowedGroups", "allowedTags", "createdBy")
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
  '7cbf8bba-7821-4629-93df-50ca0755ce6f'
) ON CONFLICT (id) DO NOTHING;

SELECT id, "keyPrefix", "displayName", status FROM registration_keys;
