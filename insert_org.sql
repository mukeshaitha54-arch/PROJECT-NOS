INSERT INTO organization_members ("id", "organizationId", "userId", "role", "joinedAt", "updatedAt", "departmentIds", "teamIds", "isSuspended") 
SELECT 'mem-mukesh-01', 'org-mukesh-local', id, 'OWNER', NOW(), NOW(), ARRAY[]::text[], ARRAY[]::text[], false 
FROM users WHERE email = 'mukeshaitha54@gmail.com' 
ON CONFLICT ("id") DO NOTHING;
