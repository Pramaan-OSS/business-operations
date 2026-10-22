# Business insights

Builds periodic summaries from the team's local financial and activity records. Metric
selection, comparisons and anomaly checks run locally. Narrative generation uses
`llm.complete` through the shared Pramaan client and requires `PRAMAAN_API_KEY`.

Use `PRAMAAN_FAKE=1` with a dummy key for offline checks. Generated narrative results are
validated before storage; incomplete replies never count as a completed summary.
Background scheduling uses the local worker and Redis.

```typescript
import { createInsightsService } from "@business-operations/insights";
import { db } from "@business-operations/db/client";
const service = createInsightsService(db);
```

The service is used by the worker's insight jobs. Test calculations and content validation
with `bun test packages/insights` from the repository root.
