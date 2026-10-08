# Backend modularization — Production deployment

Date: 2026-10-08 (Africa/Cairo).

## Result

- Existing Apps Script project: `CUT-HUB`.
- Script ID: `1UmjdRMGLukMt_0Be_ZL2krphwtZ-CQHPOiZ3GF10pY9-glgvoubfGflP`.
- Existing Production deployment ID: `AKfycbzWjM4X4JDTXRYe14oHL8m1Ex3GT9B8kMT6q8yp9eNMw6F6eSEY4zCXTYkyIL7K1ejR`.
- Prior immutable version: **38**. Published immutable version: **39**.
- Editor source: **89 SERVER_JS modules** and the original manifest.
- Same endpoint, execution identity, access configuration, and bound spreadsheet.

## Source preservation

The live Production source differed from the development snapshot in `backend/`, including staff lifecycle and transaction handlers. Production was split from its own verified v38 source. Development files were preserved independently.

`apps-script/production/source-map.json` records every module, its order and SHA-256, and the original two source-file SHA-256 values. Reassembling each group reproduces all original bytes. The manifest SHA-256 is unchanged. Loading all modules in order preserved the same global interfaces; 811 functions, including engine methods, matched their original function text.

## Deployment verification

1. Read and backed up project identity, editor content, immutable v38 content, and existing deployment configuration.
2. Verified the project was bound to the pinned Production spreadsheet.
3. Confirmed editor content and deployment pointer had not changed since review.
4. Uploaded the modules and read back matching content.
5. Created immutable v39 and verified its source against the candidate.
6. Updated the existing deployment to v39 and verified its pointer.
7. Sent an unauthenticated `totalIncome` request to the existing endpoint; it was rejected with `authRequired: true`.

No data migration, schema initialization, trigger installation, credential change, or authenticated business mutation was performed. The remote smoke test covers the authorization gate; it does not claim a complete authenticated financial/booking workflow test.

Private source backups and operational evidence remain in the ignored `.backend-refactor-deployment/` directory. The previous immutable version 38 remains the rollback target.

## Local verification

```sh
node scripts/build-backend.js --check-baseline
node scripts/build-production-apps-script.js
node --test tests/backend-modularization.test.js tests/production-backend-modularization.test.js
```

The development package and Production package are separate variants. Do not combine their sources in one Apps Script project.
