/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../src/app.module';

jest.setTimeout(60000);

describe('Form Management & Public Form Flow (e2e)', () => {
  let app: INestApplication;
  let user1Token: string;
  let user2Token: string;
  let createdFormId: string;
  let publicId: string;
  let v1Id: string;
  let v2Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // Register User 1
    const email1 = `form.user1.${Date.now()}@example.com`;
    const res1 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Form Creator One',
        email: email1,
        password: 'UserPassword123!',
      })
      .expect(201);
    user1Token = res1.body.accessToken;

    // Register User 2
    const email2 = `form.user2.${Date.now()}@example.com`;
    const res2 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Form Creator Two',
        email: email2,
        password: 'UserPassword123!',
      })
      .expect(201);
    user2Token = res2.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Form Creation & Single Mutable Draft', () => {
    it('should create a form and automatically generate editable draft and publicId', async () => {
      const res = await request(app.getHttpServer())
        .post('/forms')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Customer Satisfaction Survey' })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Customer Satisfaction Survey');
      expect(res.body.publicId).toBeDefined();
      expect(res.body.publicId.startsWith('f_')).toBe(true);
      expect(res.body.deployedVersionId).toBeNull();
      expect(res.body.draft).toBeDefined();
      expect(res.body.draft.title).toBe('Customer Satisfaction Survey');
      expect(res.body.hasUnpublishedChanges).toBe(true);

      createdFormId = res.body.id;
      publicId = res.body.publicId;
    });

    it('should list forms for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/forms')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((f: any) => f.id === createdFormId);
      expect(found).toBeDefined();
      expect(found.publicId).toBe(publicId);
    });

    it('should get single form with draft state', async () => {
      const res = await request(app.getHttpServer())
        .get(`/forms/${createdFormId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(res.body.id).toBe(createdFormId);
      expect(res.body.draft).toBeDefined();
    });
  });

  describe('2. Single Draft Editing & Deployment (Release Creation)', () => {
    it('should update draft without modifying public form', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/forms/${createdFormId}/draft`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ title: 'Customer Feedback v1 (Updated)' })
        .expect(200);

      expect(res.body.draft.title).toBe('Customer Feedback v1 (Updated)');
      expect(res.body.hasUnpublishedChanges).toBe(true);

      // Public form is not deployed yet
      const pubRes = await request(app.getHttpServer())
        .get(`/public/forms/${publicId}`)
        .expect(200);

      expect(pubRes.body.isDeployed).toBe(false);
    });

    it('should deploy draft as Version 1', async () => {
      const res = await request(app.getHttpServer())
        .post(`/forms/${createdFormId}/deploy`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(201);

      expect(res.body.deployedVersionId).toBeDefined();
      expect(res.body.versionsCount).toBe(1);
      expect(res.body.versions).toHaveLength(1);
      expect(res.body.versions[0].versionNumber).toBe(1);
      expect(res.body.versions[0].title).toBe('Customer Feedback v1 (Updated)');
      expect(res.body.versions[0].isDeployed).toBe(true);

      v1Id = res.body.versions[0].id;
    });

    it('should update draft and deploy as Version 2', async () => {
      // Modify draft
      await request(app.getHttpServer())
        .patch(`/forms/${createdFormId}/draft`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ title: 'Customer Feedback v2 (Summer Edition)' })
        .expect(200);

      // Deploy v2
      const res = await request(app.getHttpServer())
        .post(`/forms/${createdFormId}/deploy`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(201);

      expect(res.body.versionsCount).toBe(2);
      expect(res.body.deployedVersion.versionNumber).toBe(2);
      expect(res.body.deployedVersion.title).toBe('Customer Feedback v2 (Summer Edition)');

      v2Id = res.body.deployedVersion.id;
    });
  });

  describe('3. Version Deployment & Single Deployed Invariant', () => {
    it('should re-activate / rollback to Version 1', async () => {
      const res = await request(app.getHttpServer())
        .post(`/forms/${createdFormId}/versions/${v1Id}/deploy`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(201);

      expect(res.body.deployedVersionId).toBe(v1Id);
      const v1 = res.body.versions.find((v: any) => v.id === v1Id);
      const v2 = res.body.versions.find((v: any) => v.id === v2Id);
      expect(v1.isDeployed).toBe(true);
      expect(v2.isDeployed).toBe(false);
    });

    it('should switch deployed version back to Version 2', async () => {
      const res = await request(app.getHttpServer())
        .post(`/forms/${createdFormId}/versions/${v2Id}/deploy`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(201);

      expect(res.body.deployedVersionId).toBe(v2Id);
      const v1 = res.body.versions.find((v: any) => v.id === v1Id);
      const v2 = res.body.versions.find((v: any) => v.id === v2Id);
      expect(v1.isDeployed).toBe(false);
      expect(v2.isDeployed).toBe(true);
    });
  });

  describe('4. Public Form Access, CDN ETag & Runtime Reflection', () => {
    it('should access public form without authentication, return ETag and Cache-Control', async () => {
      const res = await request(app.getHttpServer())
        .get(`/public/forms/${publicId}`)
        .expect(200);

      expect(res.body.name).toBe('Customer Satisfaction Survey');
      expect(res.body.title).toBe('Customer Feedback v2 (Summer Edition)');
      expect(res.body.isDeployed).toBe(true);
      expect(res.body.publicId).toBe(publicId);
      expect(res.headers['etag']).toBeDefined();
      expect(res.headers['cache-control']).toBe('public, no-cache');
    });

    it('should return 304 Not Modified when If-None-Match matches ETag', async () => {
      const initial = await request(app.getHttpServer())
        .get(`/public/forms/${publicId}`)
        .expect(200);

      const etag = initial.headers['etag'];

      await request(app.getHttpServer())
        .get(`/public/forms/${publicId}`)
        .set('If-None-Match', etag)
        .expect(304);
    });

    it('should immediately reflect rolled-back version title publicly', async () => {
      // Switch back to v1
      await request(app.getHttpServer())
        .post(`/forms/${createdFormId}/versions/${v1Id}/deploy`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(201);

      // Verify public URL immediately serves v1's title
      const res = await request(app.getHttpServer())
        .get(`/public/forms/${publicId}`)
        .expect(200);

      expect(res.body.title).toBe('Customer Feedback v1 (Updated)');
      expect(res.body.isDeployed).toBe(true);
    });

    it('should return 404 for nonexistent public form', async () => {
      await request(app.getHttpServer())
        .get('/public/forms/nonexistent-public-slug')
        .expect(404);
    });
  });

  describe('5. Access Control & Authorization', () => {
    it('should forbid other user from accessing or deploying form', async () => {
      await request(app.getHttpServer())
        .get(`/forms/${createdFormId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      await request(app.getHttpServer())
        .post(`/forms/${createdFormId}/versions/${v1Id}/deploy`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
    });

    it('should reject unauthenticated requests to protected endpoints', async () => {
      await request(app.getHttpServer())
        .get('/forms')
        .expect(401);

      await request(app.getHttpServer())
        .post('/forms')
        .send({ name: 'Hacker Form' })
        .expect(401);
    });
  });

  describe('6. Elements, Public Submissions & Unified Data View Preservation', () => {
    const elFullName = {
      id: 'fld_name',
      type: 'text',
      label: 'Full Name',
      reference: 'full_name',
      placeholder: 'Enter your name',
      required: true,
    };

    const elEmail = {
      id: 'fld_email',
      type: 'email',
      label: 'Work Email',
      reference: 'work_email',
      placeholder: 'you@company.com',
      required: true,
    };

    const elOldNotes = {
      id: 'fld_notes',
      type: 'textarea',
      label: 'Initial Notes',
      reference: 'notes',
      required: false,
    };

    it('should update draft with elements, deploy it as new version, and verify public runtime', async () => {
      await request(app.getHttpServer())
        .patch(`/forms/${createdFormId}/draft`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Version with Elements',
          elements: [elFullName, elEmail, elOldNotes],
          sections: [
            {
              id: 'sec_1',
              name: 'Main Section',
              layout: 'column',
              zones: [
                {
                  id: 'zone_1',
                  layout: 'column',
                  elements: [elFullName, elEmail, elOldNotes],
                },
              ],
            },
          ],
        })
        .expect(200);

      // Deploy
      await request(app.getHttpServer())
        .post(`/forms/${createdFormId}/deploy`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(201);

      // Verify public form now returns the elements
      const pubRes = await request(app.getHttpServer())
        .get(`/public/forms/${publicId}`)
        .expect(200);

      expect(pubRes.body.elements).toHaveLength(3);
      expect(pubRes.body.elements[0].label).toBe('Full Name');
    });

    it('should reject submission if required element is missing', async () => {
      await request(app.getHttpServer())
        .post(`/public/forms/${publicId}/submissions`)
        .send({
          data: {
            work_email: 'test@example.com',
          },
        })
        .expect(400);
    });

    it('should submit response for deployed form', async () => {
      const subRes = await request(app.getHttpServer())
        .post(`/public/forms/${publicId}/submissions`)
        .send({
          data: {
            full_name: 'Alice Johnson',
            work_email: 'alice@example.com',
            notes: 'Great onboarding experience!',
          },
        })
        .expect(201);

      expect(subRes.body.message).toBe('Submission received successfully');
      expect(subRes.body.id).toBeDefined();
    });

    it('should create new version adding a new field (rating) and removing an old field (notes)', async () => {
      const elRating = {
        id: 'fld_rating',
        type: 'select',
        label: 'Satisfaction Score',
        reference: 'rating',
        required: true,
      };

      // New draft has Full Name, Email, and Satisfaction Score (notes removed)
      await request(app.getHttpServer())
        .patch(`/forms/${createdFormId}/draft`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Version with Rating',
          elements: [elFullName, elEmail, elRating],
          sections: [
            {
              id: 'sec_1',
              name: 'Main Section',
              layout: 'column',
              zones: [
                {
                  id: 'zone_1',
                  layout: 'column',
                  elements: [elFullName, elEmail, elRating],
                },
              ],
            },
          ],
        })
        .expect(200);

      // Deploy
      await request(app.getHttpServer())
        .post(`/forms/${createdFormId}/deploy`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(201);

      // Verify public form reflects new elements
      const pubRes = await request(app.getHttpServer())
        .get(`/public/forms/${publicId}`)
        .expect(200);

      expect(pubRes.body.elements).toHaveLength(3);
      expect(pubRes.body.elements.find((e: any) => e.reference === 'rating')).toBeDefined();
      expect(pubRes.body.elements.find((e: any) => e.reference === 'notes')).toBeUndefined();
    });

    it('should submit response for second version deployed form', async () => {
      const subRes = await request(app.getHttpServer())
        .post(`/public/forms/${publicId}/submissions`)
        .send({
          data: {
            full_name: 'Bob Smith',
            work_email: 'bob@example.com',
            rating: '5',
          },
        })
        .expect(201);

      expect(subRes.body.message).toBe('Submission received successfully');
    });

    it('should return complete unified Data View preserving all columns and historical rows', async () => {
      const dataRes = await request(app.getHttpServer())
        .get(`/forms/${createdFormId}/data`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(dataRes.body.formId).toBe(createdFormId);
      expect(dataRes.body.totalCount).toBe(2);

      // Both historical columns 'notes' and 'rating' must be preserved in the column set
      const colNotes = dataRes.body.columns.find((c: any) => c.reference === 'notes');
      const colRating = dataRes.body.columns.find((c: any) => c.reference === 'rating');
      const colName = dataRes.body.columns.find((c: any) => c.reference === 'full_name');

      expect(colNotes).toBeDefined();
      expect(colRating).toBeDefined();
      expect(colName).toBeDefined();
    });

    it('should eliminate duplicated columns when submission contains both element ID and reference', async () => {
      // Submit with duplicate ID keys as old clients or manual API calls might do
      await request(app.getHttpServer())
        .post(`/public/forms/${publicId}/submissions`)
        .send({
          data: {
            full_name: 'Charlie Brown',
            fld_name: 'Charlie Brown',
            work_email: 'charlie@example.com',
            fld_email: 'charlie@example.com',
            rating: '4',
            fld_rating: '4',
          },
        })
        .expect(201);

      const dataRes = await request(app.getHttpServer())
        .get(`/forms/${createdFormId}/data`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(dataRes.body.totalCount).toBe(3);

      // Verify no duplicate columns exist for fld_name, fld_email, or fld_rating
      const colIdFullName = dataRes.body.columns.find((c: any) => c.id === 'fld_name');
      const colIdEmail = dataRes.body.columns.find((c: any) => c.id === 'fld_email');
      const colIdRating = dataRes.body.columns.find((c: any) => c.id === 'fld_rating');

      expect(colIdFullName).toBeUndefined();
      expect(colIdEmail).toBeUndefined();
      expect(colIdRating).toBeUndefined();

      // Check the latest row data: it must map to the canonical columns cleanly
      const latestRow = dataRes.body.rows[0];
      expect(latestRow.data.full_name).toBe('Charlie Brown');
      expect(latestRow.data.work_email).toBe('charlie@example.com');
      expect(latestRow.data.rating).toBe('4');

      // Verify submissionsCount on GET /forms/:id
      const formDetailRes = await request(app.getHttpServer())
        .get(`/forms/${createdFormId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      expect(formDetailRes.body.submissionsCount).toBe(3);

      // Verify submissionsCount on GET /forms list
      const formListRes = await request(app.getHttpServer())
        .get('/forms')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      const matchedForm = formListRes.body.find((f: any) => f.id === createdFormId);
      expect(matchedForm).toBeDefined();
      expect(matchedForm.submissionsCount).toBe(3);
    });
  });

  describe('7. Hierarchical Form Structure, Duplicate Reference Guard & Regex Validation', () => {
    let hierarchicalFormId: string;
    let hierarchicalPublicId: string;

    it('should create form with realistic default form structure in draft', async () => {
      const res = await request(app.getHttpServer())
        .post('/forms')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Realistic Contact & Feedback Form' })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.draft.sections).toBeDefined();
      expect(res.body.draft.sections.length).toBeGreaterThanOrEqual(2);
      expect(res.body.draft.sections[0].zones.length).toBeGreaterThanOrEqual(1);

      // Verify non-interactive title/description exist in default template
      const allElements = res.body.draft.elements;
      expect(allElements.some((el: any) => el.type === 'title')).toBe(true);
      expect(allElements.some((el: any) => el.type === 'description')).toBe(true);

      hierarchicalFormId = res.body.id;
      hierarchicalPublicId = res.body.publicId;
    });

    it('should block deployment if duplicate references exist in sections', async () => {
      // Update draft with duplicate references
      const duplicateSections = [
        {
          id: 'sec_1',
          name: 'Section 1',
          layout: 'row',
          zones: [
            {
              id: 'zone_1',
              layout: 'column',
              responsiveWidth: { desktop: 'half', tablet: 'full', mobile: 'full' },
              elements: [
                {
                  id: 'el_1',
                  type: 'text',
                  name: 'User Handle',
                  reference: 'handle',
                  required: true,
                },
              ],
            },
            {
              id: 'zone_2',
              layout: 'column',
              responsiveWidth: { desktop: 'half', tablet: 'full', mobile: 'full' },
              elements: [
                {
                  id: 'el_2',
                  type: 'text',
                  name: 'Company Handle',
                  reference: 'handle', // DUPLICATE reference!
                  required: true,
                },
              ],
            },
          ],
        },
      ];

      await request(app.getHttpServer())
        .patch(`/forms/${hierarchicalFormId}/draft`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ sections: duplicateSections })
        .expect(200);

      // Attempting to deploy must be rejected with 400
      const deployRes = await request(app.getHttpServer())
        .post(`/forms/${hierarchicalFormId}/deploy`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(400);

      expect(deployRes.body.message).toContain('duplicate field reference');
    });

    it('should allow deployment once duplicate reference is resolved and enforce regex validation on submission', async () => {
      // Fix duplicate reference and configure regex validation
      const validSections = [
        {
          id: 'sec_1',
          name: 'Account Section',
          layout: 'row',
          zones: [
            {
              id: 'zone_1',
              layout: 'column',
              responsiveWidth: { desktop: 'full', tablet: 'full', mobile: 'full' },
              elements: [
                {
                  id: 'el_1',
                  type: 'text',
                  name: 'Username',
                  reference: 'username',
                  required: true,
                  validation: {
                    enabled: true,
                    pattern: '^[a-zA-Z0-9_]{3,10}$',
                    errorMessage: 'Username must be 3-10 alphanumeric characters',
                    successMessage: 'Username is valid',
                  },
                },
              ],
            },
          ],
        },
      ];

      await request(app.getHttpServer())
        .patch(`/forms/${hierarchicalFormId}/draft`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ sections: validSections })
        .expect(200);

      // Now deploy succeeds
      await request(app.getHttpServer())
        .post(`/forms/${hierarchicalFormId}/deploy`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(201);

      // Submit with invalid regex input (contains '@') -> must be rejected with 400
      const invalidSub = await request(app.getHttpServer())
        .post(`/public/forms/${hierarchicalPublicId}/submissions`)
        .send({
          data: {
            username: 'bad@user',
          },
        })
        .expect(400);

      expect(invalidSub.body.message).toBe('Username must be 3-10 alphanumeric characters');

      // Submit with valid input -> succeeds with 201
      const validSub = await request(app.getHttpServer())
        .post(`/public/forms/${hierarchicalPublicId}/submissions`)
        .send({
          data: {
            username: 'valid_user',
          },
        })
        .expect(201);

      expect(validSub.body.id).toBeDefined();
    });

    it('should enforce idempotency when Idempotency-Key header is supplied', async () => {
      const idempotencyKey = `idem_${Date.now()}_test`;

      // First submission
      const sub1 = await request(app.getHttpServer())
        .post(`/public/forms/${hierarchicalPublicId}/submissions`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          data: {
            username: 'idem_user',
          },
        })
        .expect(201);

      const firstId = sub1.body.id;
      expect(firstId).toBeDefined();

      // Second identical submission with same idempotency key
      const sub2 = await request(app.getHttpServer())
        .post(`/public/forms/${hierarchicalPublicId}/submissions`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          data: {
            username: 'idem_user',
          },
        })
        .expect(201);

      // Must return identical submission ID and not create duplicate
      expect(sub2.body.id).toBe(firstId);
    });

    it('should reject submission with invalid select/radio option not in whitelist', async () => {
      // Create and deploy form with select field
      const optionSections = [
        {
          id: 'sec_opts',
          layout: 'column',
          zones: [
            {
              id: 'zone_opts',
              layout: 'column',
              responsiveWidth: { desktop: 'full', tablet: 'full', mobile: 'full' },
              elements: [
                {
                  id: 'el_tier',
                  type: 'select',
                  reference: 'tier',
                  label: 'Subscription Tier',
                  options: ['Free', 'Pro', 'Enterprise'],
                  required: true,
                },
              ],
            },
          ],
        },
      ];

      await request(app.getHttpServer())
        .patch(`/forms/${hierarchicalFormId}/draft`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ sections: optionSections })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/forms/${hierarchicalFormId}/deploy`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(201);

      // Submit with unlisted option "HackedTier" -> must be rejected with 400
      const res = await request(app.getHttpServer())
        .post(`/public/forms/${hierarchicalPublicId}/submissions`)
        .send({
          data: {
            tier: 'HackedTier',
          },
        })
        .expect(400);

      expect(res.body.message).toContain('Subscription Tier');
      expect(res.body.message).toContain('Free, Pro, Enterprise');

      // Submit with valid option -> succeeds
      await request(app.getHttpServer())
        .post(`/public/forms/${hierarchicalPublicId}/submissions`)
        .send({
          data: {
            tier: 'Pro',
          },
        })
        .expect(201);
    });

    it('should respect conditional visibility and skip required check for hidden fields', async () => {
      // Create form with conditional field
      const conditionalSections = [
        {
          id: 'sec_cond',
          layout: 'column',
          zones: [
            {
              id: 'zone_cond',
              layout: 'column',
              responsiveWidth: { desktop: 'full', tablet: 'full', mobile: 'full' },
              elements: [
                {
                  id: 'el_trigger',
                  type: 'select',
                  reference: 'has_business',
                  label: 'Do you have a registered business?',
                  options: ['Yes', 'No'],
                  required: true,
                },
                {
                  id: 'el_tax_id',
                  type: 'text',
                  reference: 'tax_id',
                  label: 'Business Tax ID',
                  required: true,
                  conditions: {
                    action: 'show',
                    matchType: 'all',
                    rules: [
                      {
                        fieldIdOrReference: 'has_business',
                        operator: 'equals',
                        value: 'Yes',
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ];

      await request(app.getHttpServer())
        .patch(`/forms/${hierarchicalFormId}/draft`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ sections: conditionalSections })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/forms/${hierarchicalFormId}/deploy`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(201);

      // Submit has_business: "No" WITHOUT tax_id -> succeeds because tax_id is conditionally hidden
      await request(app.getHttpServer())
        .post(`/public/forms/${hierarchicalPublicId}/submissions`)
        .send({
          data: {
            has_business: 'No',
          },
        })
        .expect(201);

      // Submit has_business: "Yes" WITHOUT tax_id -> fails because tax_id is conditionally visible & required
      const failRes = await request(app.getHttpServer())
        .post(`/public/forms/${hierarchicalPublicId}/submissions`)
        .send({
          data: {
            has_business: 'Yes',
          },
        })
        .expect(400);

      expect(failRes.body.message).toContain('Business Tax ID');
    });

    it('should return server-side paginated results from GET /forms/:id/data with page & limit', async () => {
      const dataRes = await request(app.getHttpServer())
        .get(`/forms/${hierarchicalFormId}/data?page=1&limit=2`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(dataRes.body.formId).toBe(hierarchicalFormId);
      expect(dataRes.body.page).toBe(1);
      expect(dataRes.body.pageSize).toBe(2);
      expect(dataRes.body.totalCount).toBeGreaterThanOrEqual(3);
      expect(dataRes.body.totalPages).toBeGreaterThanOrEqual(2);
      expect(dataRes.body.rows.length).toBeLessThanOrEqual(2);
    });
  });
});
