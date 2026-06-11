# Sprint Production Validation Plan

## Objective

Validate that the Production Score 9.2 is not just theoretical, but actually sustains under real usage. This is the final gate before opening Trial System, AI Core, and WhatsApp Cloud API.

## Validation Scope

### Test 1: Multi-Tenant Isolation

**Objective:** Ensure strict tenant data isolation

**Test Scenarios:**
1. **Tenant A creates data**
   - Tenant A creates contact, conversation, deal, task
   - Verify data is accessible only to Tenant A

2. **Tenant B tries to read Tenant A's data**
   - Tenant B attempts to access Tenant A's contact by ID
   - **Expected:** 404 Not Found

3. **Tenant B tries to edit Tenant A's data**
   - Tenant B attempts to update Tenant A's contact
   - **Expected:** 404 Not Found or 403 Forbidden

4. **Tenant B tries to delete Tenant A's data**
   - Tenant B attempts to delete Tenant A's conversation
   - **Expected:** 404 Not Found or 403 Forbidden

**Validation Method:**
- Create test script with multiple tenant contexts
- Verify Prisma queries respect tenantId filters
- Check API responses for proper isolation

**Acceptance Criteria:**
- All cross-tenant access attempts fail with 404/403
- Tenant data never leaks across tenant boundaries
- Audit logs show correct tenantId for all operations

---

### Test 2: RBAC Enforcement

**Objective:** Ensure role-based access control is enforced correctly

**Test Scenarios:**
1. **contacts.read permission**
   - User without contacts.read permission attempts to list contacts
   - **Expected:** 403 Forbidden

2. **contacts.create permission**
   - User without contacts.create permission attempts to create contact
   - **Expected:** 403 Forbidden

3. **contacts.update permission**
   - User without contacts.update permission attempts to update contact
   - **Expected:** 403 Forbidden

4. **contacts.delete permission**
   - User without contacts.delete permission attempts to delete contact
   - **Expected:** 403 Forbidden

**Validation Method:**
- Create test users with specific permission sets
- Attempt operations with different permission combinations
- Verify API responses respect permission checks

**Acceptance Criteria:**
- All unauthorized operations return 403
- Authorized operations succeed
- Permission checks are enforced at API route level
- Audit logs record permission violations

---

### Test 3: Concurrency Scenarios

**Objective:** Ensure concurrency protection prevents race conditions

**Test Scenarios:**
1. **Two agents claim same conversation simultaneously**
   - Agent A and Agent B send claim requests for same conversation at same time
   - **Expected:** 1 success, 1 failure

2. **Concurrent updates to same conversation**
   - Two users attempt to update same conversation simultaneously
   - **Expected:** Transaction isolation prevents data corruption

3. **Takeover while conversation is being edited**
   - Agent A claims conversation, Agent B attempts takeover
   - **Expected:** Proper transfer with history tracking

**Validation Method:**
- Create test script with concurrent requests
- Use Promise.all() to simulate simultaneous operations
- Verify database state is consistent
- Check ConversationAssignment and ConversationTransfer records

**Acceptance Criteria:**
- No data corruption under concurrent operations
- Proper history tracking for all operations
- Transactions prevent partial updates
- One operation succeeds, others fail appropriately

---

### Test 4: Soft Delete

**Objective:** Ensure soft delete is enforced and physical delete is prevented

**Test Scenarios:**
1. **Record remains in database after deletion**
   - Delete contact via API
   - Query database directly for deleted record
   - **Expected:** Record exists with deletedAt set

2. **Deleted record doesn't appear in listings**
   - Delete contact
   - List all contacts via API
   - **Expected:** Deleted contact not in response

3. **Deleted record cannot be accessed**
   - Attempt to GET deleted contact by ID
   - **Expected:** 404 Not Found

4. **Physical delete is prevented**
   - Attempt direct Prisma delete (bypassing API)
   - **Expected:** Should be prevented at application level

**Validation Method:**
- Perform delete operations via API
- Query database to verify soft delete
- Attempt access to deleted records
- Verify deletedAt is set correctly

**Acceptance Criteria:**
- All entities use soft delete (deletedAt column)
- Deleted records never appear in API responses
- Deleted records return 404 when accessed
- No physical delete operations in application code

---

### Test 5: Audit Trail

**Objective:** Ensure comprehensive audit trail for all operations

**Test Scenarios:**
1. **Create operation audit**
   - Create contact via API
   - Check AuditLog for record
   - **Expected:** AuditLog entry with action='create', entity='contact'

2. **Update operation audit**
   - Update contact via API
   - Check AuditLog for record
   - **Expected:** AuditLog entry with action='update', entity='contact'

3. **Delete operation audit**
   - Delete contact via API
   - Check AuditLog for record
   - **Expected:** AuditLog entry with action='delete', entity='contact'

4. **View operation audit**
   - View contact details via API
   - Check AuditLog for record
   - **Expected:** AuditLog entry with action='read', entity='contact'

5. **Request ID propagation**
   - Perform operation with custom request ID
   - Check AuditLog for requestId
   - **Expected:** requestId matches the one sent in request

**Validation Method:**
- Execute CRUD operations via API
- Query AuditLog table for corresponding entries
- Verify all required fields are populated:
  - tenantId
  - userId
  - entity
  - entityId
  - action
  - requestId
  - ipAddress
  - userAgent
  - metadata

**Acceptance Criteria:**
- All CRUD operations create AuditLog entries
- Request ID is properly propagated
- Sensitive data is sanitized (passwords, tokens)
- Audit trail is complete and queryable

---

### Test 6: Health Monitoring

**Objective:** Ensure health monitoring works in real environment

**Test Scenarios:**
1. **Overall health endpoint**
   - Call GET /api/health
   - **Expected:** Returns status, timestamp, latencyMs

2. **Database health endpoint**
   - Call GET /api/health/db
   - **Expected:** Returns database health status and latency

3. **Operational score endpoint**
   - Call GET /api/health/score
   - **Expected:** Returns overall score (0-100) and component scores

4. **System health dashboard**
   - Access /admin/system-health
   - **Expected:** Dashboard displays real health data
   - Service health cards show correct status
   - Operational score is displayed correctly
   - Active alerts are shown

**Validation Method:**
- Call health endpoints via HTTP requests
- Verify response structure matches expected format
- Check dashboard renders correctly in browser
- Validate operational score calculation matches expected values

**Acceptance Criteria:**
- All health endpoints return valid responses
- Operational score is between 0-100
- Dashboard displays real data from API
- Health status reflects actual system state
- Alerts are generated when thresholds are breached

---

## Execution Plan

### Prerequisites
- Database running with test data
- Multiple test tenants created
- Test users with different permission sets
- Application running in development/staging environment

### Test Execution Order
1. Multi-Tenant Isolation (foundational)
2. RBAC Enforcement (security)
3. Soft Delete (data integrity)
4. Audit Trail (observability)
5. Concurrency Scenarios (critical path)
6. Health Monitoring (system validation)

### Success Criteria
- All 6 test suites pass
- No critical bugs found
- Known limitations documented
- Production Score validated as accurate
- System deemed ready for Trial System

### Failure Criteria
- Any test suite fails
- Critical security vulnerability found
- Data isolation breach detected
- Concurrency issues under load
- Health monitoring unreliable

## Next Steps After Validation

**If Validation Passes:**
- Production Score confirmed as 9.2+
- Sprint Production Readiness officially closed
- Governance approval for Trial System
- Begin Trial & Onboarding System sprint

**If Validation Fails:**
- Document all failures
- Create hotfix sprint for critical issues
- Re-run validation after fixes
- Production Score adjusted based on findings

## Related Documentation
- Sprint Production Readiness Report
- Known Limitations
- Phase 6 Production Critical Enhancements Report
- Operational Score Audit Report
