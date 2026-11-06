# Cloud LLM provider guarantees and de-identification of Portuguese clinical free text (as of 2026-11-06)

Reading notes for the report writer:
- Scope: whether "pseudonymize + zero data retention (ZDR) contract" is a sound control for psychotherapy notes. No vendor is presented as compliant. These notes describe guarantees and gaps, and they are not legal advice.
- Quote reliability: **[raw]** means the text came from the page itself or a PDF I extracted. **[fetch-summary]** means a fetch tool's summarizer returned the quote, so re-check it on the live page before using it in the TCC. **[snippet]** means I saw it only in search-result text and did not read the full source.
- Blocked pages: openai.com returned HTTP 403 (Enterprise Privacy, DPA, the NYT response post). PubMed and nature.com also blocked automated fetches. Where this affects a claim, it is marked.
- Conflict note: these notes were written by a Claude model, and Anthropic is one of the five providers assessed. Its terms get the same treatment as the others.

---

## Provider terms: retention, ZDR, abuse monitoring, training, DPAs, Brazil region, residency, Brazilian SCCs

### Takeaway
All five stacks say API content is not used for training by default. None offers unconditional ZDR: legal retention and, for some, flagged-content retention survive, and the newest frontier models are being pulled out of ZDR. As of November 2026 no frontier-class model is confirmed for pay-per-use in-Brazil inference. The Brazil options are one Gemini 2.5 Flash entry on Vertex AI, older GPT-4.x models on reserved capacity in Azure Brazil South, and embeddings. Only Google was confirmed to publish ANPD SCCs.

### Cited Findings

#### Comparison table (detail and quotes below)

| Item | OpenAI API | Gemini API (AI Studio) | Vertex AI | Anthropic API | Azure (Foundry) | AWS Bedrock |
|---|---|---|---|---|---|---|
| Default retention | Abuse logs up to 30 days | 55 days for abuse monitoring | Logged only if flagged, up to 90 days (standard Google models, online terms) | Backend deletion within 30 days | Stored for human review only if flagged | Depends on model mode |
| ZDR access | Prior approval, via sales | Not found on pages read | Mostly configuration; Master Agreement customers exempt from logging | Via sales, per organization | Application, account-managed customers only | API setting `none` for models that allow it |
| Survives ZDR | Law, harm protection; many endpoints not eligible | n/a | Search grounding 3 days, Maps 30 days if used | Law; flagged content up to 2 years | Automated review continues | Model-specific retention; CSAM review |
| Training by default | No | No (paid); Yes (unpaid) | No | No | No | No (models providers get no access) |
| Frontier inference in Brazil | Brazil not listed | Not found | gemini-2.5-flash only | No (`us`/`global` only) | Global only for current models; regional provisioned for GPT-4.1/4o | No; embeddings only in-region in pages read |
| Brazilian SCCs | Unconfirmed (page blocked) | Unconfirmed | **Yes, published** | Not in DPA | Unconfirmed | Not in public DPA |

#### OpenAI API
- Retention: abuse-monitoring logs are "retained for up to 30 days, unless longer retention is required by law." Also retention "reasonably necessary to protect our services or any third party from harm." — [OpenAI, Your data](https://developers.openai.com/api/docs/guides/your-data) [fetch-summary]
- ZDR is not self-serve: "Currently, these controls are subject to prior approval by OpenAI and acceptance of additional requirements," with eligibility handled through sales. — [OpenAI](https://developers.openai.com/api/docs/guides/your-data) [fetch-summary]
- Modified Abuse Monitoring excludes customer content "other than image and file inputs in rare cases"; ZDR excludes it the same way. — [OpenAI](https://developers.openai.com/api/docs/guides/your-data) [fetch-summary]
- Endpoints listed as not ZDR-eligible include `/v1/conversations`, `/v1/assistants`, `/v1/threads`, `/v1/vector_stores`, `/v1/files`, `/v1/fine_tuning/jobs`, `/v1/evals`, `/v1/batches`. — [OpenAI](https://developers.openai.com/api/docs/guides/your-data) [fetch-summary]
- Training: "data sent to the OpenAI API is not used to train or improve OpenAI models" unless the customer opts in. — [OpenAI](https://developers.openai.com/api/docs/guides/your-data) [fetch-summary]
- Residency: the regional table lists US, Europe, Australia, Canada, Japan, India, Singapore, South Korea, UK, UAE. **Brazil is not listed.** — [OpenAI](https://developers.openai.com/api/docs/guides/your-data) [fetch-summary]

#### Google: Gemini API vs Vertex AI (two different products and contracts)
- Gemini API terms, effective 23 March 2026. Unpaid: Google uses content "to provide, improve, and develop" and "human reviewers may read, annotate, and process your API input and output"; "Do not submit sensitive, confidential, or personal information to the Unpaid Services." Paid: "Google doesn't use your prompts ... or responses to improve our products," but "Google logs prompts and responses for a limited period of time, solely for detecting and preventing violations." — [Gemini API terms](https://aistudio.google.com/docs/terms) [fetch-summary]
- Same terms, applying to all Services: "You may not use the Services in clinical practice, to provide medical advice" (the extract is truncated, so read the full sentence). — [Gemini API terms](https://aistudio.google.com/docs/terms) [fetch-summary]
- Gemini API usage policy: Google "retains the following data for fifty-five (55) days" for abuse monitoring; "Data can be accessed for human review only by authorized Google employees." The page does not mention ZDR or a paid-tier exemption. — [Gemini usage policies](https://aistudio.google.com/docs/usage-policies) [fetch-summary]
- Vertex training: "Google won't use your data to train or fine-tune any AI/ML models without your prior permission or instruction." — [Vertex data governance](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/data-governance) [fetch-summary]
- Vertex ZDR is largely configuration: keep request-response logging off, set `store=false` on the Interactions API, disable session resumption, disable implicit caching. In-memory cache is deleted within 24 hours. Search grounding stores queries "for up to three (3) days" with "no way to disable"; Maps grounding stores for 30 days. — [Vertex data governance](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/data-governance) [fetch-summary]
- Vertex abuse monitoring, standard Google models: logging occurs only when classifiers flag activity, "stored securely for up to 90 days," and "Authorized Google employees may assess the flagged prompts"; customers with a Google Cloud Master Agreement are exempt by default. — [Vertex abuse monitoring](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/abuse-monitoring) [fetch-summary]
- Vertex frontier tiers: Google Frontier Models logs are kept in the customer's environment for up to 30 days. For Advanced AI models (Claude Mythos and Fable), "All prompts and responses will be logged" for up to 30 days, and opting out "may not be possible." For Fable 5 and Mythos 5, "you must enable sharing this data with Anthropic for abuse monitoring." — [Vertex abuse monitoring](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/abuse-monitoring) [fetch-summary]
- Brazil: only **Gemini 2.5 Flash** is marked for southamerica-east1 on the residency page (a search snippet also shows a Live API native-audio variant). Data at rest "remains at rest in that location." Global endpoints "don't provide any data residency guarantees." — [Vertex data residency](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency) [fetch-summary]
- The locations page warns that endpoints do not guarantee in-region ML processing and defers to the residency page. — [Vertex locations](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/locations?hl=bg) [snippet]

#### Anthropic API
- Default: "we automatically delete inputs and outputs on our backend within 30 days of receipt or generation," unless otherwise agreed. Flagged content: inputs and outputs up to 2 years, classification scores up to 7 years. — [Anthropic Privacy Center](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data) [fetch-summary]
- **Apparent inconsistency:** the API docs say "Conversation content (your prompts and Claude's outputs) is not retained by default; the exception is Covered Models." — [API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention) [raw]. This does not match the 30-day default above. I could not reconcile them; the contract would govern.
- ZDR is sales-gated: "To request ZDR for your organization, contact the Anthropic sales team"; it is enabled per organization. — [Anthropic](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention) [raw]
- ZDR exceptions: "Even with ZDR or HIPAA arrangements in place, Anthropic may retain data where required by law or where it has been flagged by Anthropic's automated trust and safety systems. As a result, if a chat or session is flagged, Anthropic may retain inputs and outputs for up to 2 years." — [Anthropic](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention) [raw]
- Models withdrawn from ZDR: Fable 5.1, Mythos 5.1, Fable 5 and Mythos 5 "require 30-day data retention and are not available under ZDR unless expressly authorized by Anthropic." — [Anthropic](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention) [raw]
- ZDR can be silently exceeded: "Under ZDR, the API does **not** block these features"; using a non-eligible feature (Batch, Files, code execution) "is a choice to step outside your ZDR arrangement." — [Anthropic](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention) [raw]
- Residency: "Only `"us"` and `"global"` are available" for inference, and `"us"` is the only workspace geo. — [Anthropic data residency](https://platform.claude.com/docs/en/manage-claude/data-residency) [raw]
- DPA: the fetched summary found no mention of Brazil, LGPD or ANPD; transfer schedules cover EU SCCs, UK and Swiss addenda only. Customer audit is permitted at customer expense; subprocessor objection window is 15 days. — [Anthropic DPA](https://www.anthropic.com/legal/data-processing-addendum) [fetch-summary]

#### Microsoft Azure OpenAI / Foundry
- Training and isolation: prompts, completions and embeddings "are NOT available to OpenAI or other providers of Models sold by Azure" and "are NOT used to train any generative AI foundation models without your permission or instruction." "Models sold by Azure do NOT interact with any services operated by providers." — [Azure data privacy](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/openai/data-privacy) [raw]
- Abuse monitoring: flagged samples are reviewed by LLMs by default, "with additional reviews by human reviewers as necessary." Human review is by authorized Microsoft employees with Secure Access Workstations and just-in-time approval. EEA location of reviewers is promised only for EEA deployments. — [Azure data privacy](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/openai/data-privacy) [raw]
- Retention period: the pages I read (dated 2026) **no longer state a retention duration** for abuse-monitoring data. The widely quoted 30 days was not confirmed in the current text. — [Azure abuse monitoring](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/abuse-monitoring) [raw]
- Opt-out is approval-only: modified abuse monitoring is "available only to customers and partners managed by a Microsoft account team or under an eligible program." — [Azure limited access](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/openai/limited-access) [raw]. "Some advanced Models sold by Azure may have more stringent criteria." — [Azure abuse monitoring](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/abuse-monitoring) [raw]
- Even when approved: "automated review may still be conducted," and the customer "may also be asked to agree to have abuse monitoring with human review turned on" to avoid access limits. Approval is verifiable: `ContentLogging: false` in resource JSON. — [Azure data privacy](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/openai/data-privacy) [raw]
- Location: Global types "May be processed in any Azure region"; Data Zones are US, EU and APAC only; Standard and Regional Provisioned stay in the Azure geography. Data at rest stays in the designated geography, including the abuse store. — [Azure deployment types](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/deployment-types) [raw]
- **brazilsouth availability** (I parsed the tables on a page updated 2026-10-19; confirm in the portal). Global Standard has 86 entries including GPT-5.x, GPT-6, GPT-6.1. **Standard/Regional has only `text-embedding-ada-002`.** Regional Provisioned has gpt-4.1, gpt-4.1-mini, gpt-4o (3 versions), gpt-4o-mini. Data Zone tables have no brazilsouth entry. — [Azure region availability](https://learn.microsoft.com/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure-region-availability) [raw, parsed]
- Those regional models are near end of life: gpt-4o and gpt-4o-mini provisioned offers retire 14 Jan or 14 Apr 2027 by version, and geography-based types "arrive last, have no guaranteed availability date." — [Azure model lifecycle](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirements) [raw]; [Azure deployment types](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/deployment-types) [raw]

#### AWS Bedrock
- ZDR is an API setting, the only self-serve mode I found among the five: `none` means "No request or response data is written to durable storage by AWS or shared with the model provider." If a model requires retention, the request is blocked rather than silently retained. Enforceable via organization policies (SCPs). — [Bedrock data retention](https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html) [raw]
- Provider isolation: model providers "don't have access to Amazon Bedrock logs or to customer prompts and completions." — [Bedrock data protection](https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html) [raw]
- Exceptions: for OpenAI models other than the open-weight ones, "classifier-flagged traffic will be retained for up to 30 days." For Fable 5 and 5.1, "all traffic will be retained for up to 30 days," with possible human review by AWS. Enterprise Frontier Safeguards customers get ZDR only "through December 31, 2026." — [Bedrock abuse detection](https://docs.aws.amazon.com/bedrock/latest/userguide/abuse-detection.html) [raw]
- Fable requires opting in to human review: `allowed_modes: ["aws_review", "provider_data_share"]`. By contrast Claude Opus 4.8 allows `none`. — [Bedrock data retention](https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html) [raw]
- With cross-region inference, "retained inputs and outputs are stored in destination regions." — [Bedrock abuse detection](https://docs.aws.amazon.com/bedrock/latest/userguide/abuse-detection.html) [raw]
- **sa-east-1:** Claude Opus 4.8 shows In-Region no, Geo no, Global yes. — [Opus 4.8 model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-opus-4-8.html) [raw]. The compatibility page shows the same for Opus, Sonnet and Haiku 5.5. In-Region support appeared only for two Titan embedding models, and no South American Geo profile exists (only the first 100,000 of ~696,000 characters were read). — [Bedrock regional availability](https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html) [fetch-summary, partial]
- Global profiles reach "all commercial Regions"; the destination list "can change over time." — [Bedrock inference profiles](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html) [raw]
- AWS DPA: "the Standard Contractual Clauses will only apply to Customer Data subject to the GDPR." A text search of the public PDF found no "Brazil" or "LGPD." §12.1 lets the customer choose Regions, with exceptions "as necessary to comply with the law or valid and binding order of a governmental body." §3 says AWS "will attempt to redirect the governmental body" to the customer. — [AWS DPA](https://d1.awsstatic.com/legal/aws-dpa/aws-dpa.pdf) [raw]

#### Brazilian SCCs
- Regulatory context: Resolução CD/ANPD 19/2024 published 23 Aug 2024; the transition ended 23 Aug 2025. — [Mattos Filho](https://www.mattosfilho.com.br/en/unico/dpas-contractual-clauses/) [snippet]. Clauses must be adopted unchanged. — [Baker McKenzie](https://insightplus.bakermckenzie.com/bm/data-technology/brazil-data-protection-authority-publishes-regulation-on-international-transfer-of-personal-data-and-standard-contratual-clauses) [snippet]
- **Google Cloud is the only confirmed case.** The Cloud DPA's Appendix 3 defines "BR SCCs" and applies them to "BR Restricted Transfers," linking controller-to-processor and processor-to-processor texts. — [Google Cloud DPA](https://cloud.google.com/terms/data-processing-addendum) [fetch-summary]
- The published C2P text states the clauses are "approved by the National Data Protection Authority (ANPD)" and is dated August 21, 2025. — [Google BR SCCs C2P](https://cloud.google.com/sccs/br-c2p?hl=pt-br) [raw]
- That text puts duties on the exporter: Clause 4.1 designates the Exporter for the transparency publication, data-subject requests and incident notification. Clause 19.1 requires notice of access requests "except in the event that notification is prohibited by the law of the country in which the data is processed." Clause 11 requires additional safeguards for sensitive data. The rendered "Section III - Security Measures" is empty on the page. — [Google BR SCCs C2P](https://cloud.google.com/sccs/br-c2p?hl=pt-br) [raw]
- OpenAI: third-party summaries describe GDPR, UK, Swiss and CCPA coverage with no Brazil mention; the primary DPA was blocked. **Unconfirmed.** — [ConductAtlas](https://conductatlas.com/platform/openai/openai-data-processing-addendum/) [snippet]
- Microsoft: only a Portuguese (Brazil) language version of the DPA was visible. **Unconfirmed.** — [Microsoft DPA page](https://www.microsoft.com/licensing/docs/view/Microsoft-Products-and-Services-Data-Protection-Addendum-DPA) [fetch-summary]

### Inferences
- **ZDR is a tier-dependent feature, not a stable property of a provider.** In 2026 the most capable models moved in the opposite direction: 30-day retention, mandatory human review on Bedrock, data sharing with Anthropic on Vertex, and a dated ZDR exception on Bedrock. A design relying on ZDR should assume it binds to a model version and may not survive an upgrade.
- **Psychotherapy notes are the worst-case input for flag-triggered retention.** They routinely describe suicide, self-harm, sexual abuse and violence, which are the kinds of content safety classifiers target. So "retained only if flagged" may apply to a larger share of this corpus than of ordinary traffic, and the most sensitive notes are the likeliest to be retained. Anthropic's 2-year figure is the sharpest case, and the same logic applies to Google and Azure review flows. I found no measurement of false-flag rates on clinical text; this needs testing with synthetic notes.
- "Brazil region" answers one question only. A US-parented provider remains reachable by US legal process wherever data sits (see the incidents section), and in-region processing is available only for older or smaller models. Choosing frontier quality means an international transfer in nearly every case.
- Azure's practical in-Brazil path requires reserved capacity, and the gpt-4o family there retires within about 2–5 months (the gpt-4.1 base-model date was not established). It does not look like a durable basis for a design.
- Self-serve status matters for a small clinic: OpenAI, Anthropic and Azure paths run through sales or account teams. A solo practice may simply be unable to obtain the control the architecture assumes.

### Gaps
- OpenAI Enterprise Privacy and DPA text not read (HTTP 403). Whether either covers Brazil must be checked directly.
- Microsoft DPA and Product Terms text not read; Brazilian SCC status unknown. AWS Artifact or negotiated addenda may exist beyond the public PDF, whose version date I could not identify.
- Current Azure abuse-data retention period not confirmed.
- Gemini API: no ZDR path or region control found on pages read. Vertex terms on clinical use not checked, so the Gemini API "clinical practice" restriction should not be assumed to apply to Vertex.
- gemini-2.5-flash retirement date on Vertex not found. Whether Vertex serves Claude in southamerica-east1 is unconfirmed; no evidence that it does.
- Whether OpenAI models on Bedrock are available in sa-east-1 was not visible in the portion read.
- Anthropic's two descriptions of default retention remain unreconciled.

---

## De-identification performance: Portuguese, clinical, and mental health

### Takeaway
The best published Brazilian Portuguese clinical result is recall of about 0.93 with F1 of about 0.93, on non-psychiatric hospital records, and scores collapse for organizations, locations and professions. I found no study on Portuguese mental health text or on psychotherapy transcripts with independent measurement. In practice, expect around 2–8% of identifier mentions to leak with tuned systems and much more with out-of-the-box tools.

### Cited Findings

#### Portuguese
- **AnonyMed-BR** (Schiezaro et al., Frontiers in Public Health, 2026; 2,962 samples, 387 patients, a tertiary hospital, mixed real and synthetic). BERTimbau-leNER: F1 0.9270, recall 0.9351, precision 0.9260 (F1 0.9007 on real records, 0.9447 on synthetic). GPT-4o: F1 0.9195, recall 0.9233 (F1 0.9356 on real). — [PMC12813187](https://pmc.ncbi.nlm.nih.gov/articles/PMC12813187/) [fetch-summary]
- Same paper, per-entity F1 shows failure on contextual entities. BERTimbau-leNER: Organization 0.2063 and Zip 0.0000 on synthetic; Location_other 0.1333 and Profession 0.6101 on real. GPT-4o on real: Hospital 0.2258, Profession 0.6141. Patient names are high (0.97–0.99). The authors warn rare classes give extreme scores, and flag train/test leakage risk from shared synthetic seeds. — [PMC12813187](https://pmc.ncbi.nlm.nih.gov/articles/PMC12813187/) [fetch-summary]
- BioBERTpt fine-tuned plus regex on Brazilian cardiology and pulmonology notes: precision, recall and F1 of about 0.92, 0.93, 0.93. — [PubMed 40776263](https://pubmed.ncbi.nlm.nih.gov/40776263/) [snippet; page blocked, not read]
- **Presidio on Portuguese:** default Presidio macro F1 0.270 vs 1.000 for custom checksum-validated recognizers, on 500 **synthetic** notes, for **structured identifiers** (CPF, CRM, CNS, CNPJ, RG, CEP, phone). This is a preprint, and these identifiers are easy cases. — [Brazilian-PHI, Research Square](https://www.researchsquare.com/article/rs-10757966/v1) [snippet; page body not retrievable]
- spaCy `pt_core_news_lg` 2.3.0 reports entity scores of about 91, on general news-style text, not clinical. No published recall for Presidio with this model on clinical Portuguese was found. — [spaCy models release](https://github.com/explosion/spacy-models/releases/tag/pt_core_news_lg-2.3.0) [snippet]
- OpenMed Portuguese PII models report micro-F1 of about 0.88, self-reported, on AI4Privacy and synthetic data. — [Hugging Face](https://huggingface.co/OpenMed/OpenMed-PII-Portuguese-ClinicalLongformer-Base-149M-v1) [snippet]
- A multilingual hybrid PII study's pt_BR results were about 0.51 (zero-shot LLM) vs 0.66 (RECAP) F1; the table extraction was messy. — [arXiv 2510.07551](https://arxiv.org/pdf/2510.07551) [snippet]
- BioBERTpt and SemClinBr concern clinical concept NER, not de-identification. A 2026 Portuguese benchmark reports best micro F1 of 0.76 for clinical concept NER. — [arXiv 2603.26510](https://arxiv.org/pdf/2603.26510) [snippet]

#### Mental health
- **2016 CEGS N-GRID**, 1,000 psychiatric intake records: existing systems run unchanged reached top F1 **0.799**; systems trained for two months reached top F1 **0.914**, slightly below the 2014 task, suggesting psychiatric text is harder. — [Stubbs et al., J Biomed Inform 2017, PMC5705537](https://pmc.ncbi.nlm.nih.gov/articles/PMC5705537); [survey, arXiv 1810.06765](https://arxiv.org/pdf/1810.06765) [snippet]
- **CRIS** (South London and Maudsley psychiatric register): per-patient dictionary method achieved precision 98.8%, recall 97.6%. One of 500 notes met the breach definition. Misspellings and identifiers absent from source fields stay visible (63 and 26 of 89 potential identifiers). The authors say contextual details remain a concern particular to mental health records, and the register relies on a surrounding security model (firewall, oversight committee, weekly audit). — [Fernandes et al. 2013](https://pmc.ncbi.nlm.nih.gov/articles/PMC3751474/) [fetch-summary]
- **DEDUCE** (Dutch, UMC Utrecht, 400 nursing notes and treatment plans): precision 0.814, recall 0.916, F1 0.862; name recall 0.964. — [Menger et al. 2018](https://researchinformation.umcutrecht.nl/en/publications/deduce-a-pattern-matching-method-for-automatic-de-identification-/) [snippet]
- **Therapy transcripts:** the only figure found is vendor-reported, 98% recall and 87% precision, with no independent validation. — [Eleos Health](https://medium.com/eleos-health/how-therapists-and-data-scientists-are-protecting-your-privacy-f77fb2bec2c7) [snippet]
- A psychotherapy fidelity study using Whisper plus Presidio reports de-identification sometimes strips names and places that matter for the clinical judgment. — [arXiv 2610.28772](https://arxiv.org/html/2610.28772) [snippet]

#### General clinical benchmarks, for scale
- GPT-4 on institutional notes: precision 0.9925, recall 0.8318, F1 0.8973. — [Evaluating GPT models](https://www.researchgate.net/publication/388565389_Evaluating_GPT_models_for_clinical_note_de-identification) [snippet]
- RedactOR: all-or-nothing recall 0.8214 for the system, 0.7701 and 0.8906 for commercial comparators; weakest on dates and locations. — [arXiv 2505.18380](https://arxiv.org/pdf/2505.18380) [snippet]
- Philter: reported 99.92% recall on i2b2 2014 and 99.46% on UCSF notes. Secondary source only, as the journal page was blocked. — [IntuitionLabs review](https://intuitionlabs.ai/articles/open-source-phi-de-identification-tools) [snippet]
- Neural baseline: F1 97.85 on i2b2 2014, recall 97.38; a curated English benchmark. — [Dernoncourt et al.](https://arxiv.org/pdf/1606.03475) [snippet]
- Vendor benchmark: John Snow Labs reports 0.96 PHI F1 for itself vs 0.91 Claude Opus 4.8 and 0.89 GPT-5.5. Not independent. — [John Snow Labs](https://www.johnsnowlabs.com/clinical-de-identification-benchmarks-2026-john-snow-labs-against-openai-databricks-presidio-and-llm-apis/) [snippet]
- LLM de-identification reporting is inconsistent, standard metrics miss removal of clinically relevant information, and tested models remove clinical information inappropriately. — [Aghakasiri et al., EMNLP 2025](https://arxiv.org/abs/2509.14464) [fetch-summary]

### Inferences
- **Typical leak rate, my synthesis, not a measured figure:** best tuned English or dictionary systems miss about 0.1–3% of annotated identifiers; Portuguese clinical systems miss about 6.5–8%; out-of-the-box on psychiatric text is far worse (F1 0.80 implies roughly 20% errors, split between missed and false detections). Corpora and metrics differ, so these bands are indicative only.
- **Per-note view, illustrative arithmetic.** With independent errors, P(at least one leak) = 1 − recall^N. Recall 0.93: N=10 gives 52%, N=30 gives 89%. Recall 0.98: N=10 gives 18%, N=30 gives 45%. N is an assumption, and real errors are correlated. Across dozens of sessions per patient, some leak should be expected rather than treated as an edge case.
- Recall is measured against annotated identifier categories. A rare life event is not an annotated category, so even recall 1.0 does not measure the risk that matters most here (next section).
- Weak classes in the Portuguese data (organization, hospital, location, profession) are the workplace and place details that dominate therapy narrative.
- The stack's Portuguese default (Presidio plus spaCy) should be presumed inadequate without local recognizers and a locally measured recall on synthetic notes.
- Per-patient dictionaries are worth noting for this project: the system already knows patient, relatives and clinic names from structured records, as CRIS exploited. It still will not catch misspellings or unrecorded names.

### Gaps
- No study found of de-identification on Portuguese mental health notes or transcripts, and no independent benchmark for psychotherapy transcripts in any language.
- No published recall for Presidio with `pt_core_news_lg` on real Portuguese clinical text.
- Nothing found for MedAlpaca used for de-identification.
- Full tables for Brazilian-PHI, PubMed 40776263 and the N-GRID overview not read.
- I believe the DEDUCE corpus came from a psychiatry department, but the snippet did not confirm it.

---

## Re-identification risk in free text after pseudonymization

### Takeaway
LLMs now convert unstructured text into identity matches cheaply, and redacting identifiers leaves the narrative signal intact. The evidence is strong for online text and suggestive for clinical notes, but I found no direct measurement for psychotherapy notes. Pseudonymized notes should be treated as identifiable personal data, not as anonymous.

### Cited Findings
- **Lermen et al. exists**, but note the authors and title: Lermen, Paleka, Swanson, Aerni, Carlini, Tramèr, "Large-scale online deanonymization with LLMs," arXiv:2602.16800v2, Feb 2026, a preprint. — [arXiv](https://arxiv.org/abs/2602.16800) [raw PDF]
- Results: 68.3% recall at 90% precision at 1k candidates, 55.2% at 89k; 33.0% recall at 99% precision at 89k; the classical baseline is near 0%. Log-linear extrapolation gives about 45% at 1M and 27% at 100M, which the authors treat as coarse. — [Lermen et al.](https://arxiv.org/pdf/2602.16800) [raw PDF]
- Anthropic Interviewer transcripts (partially redacted scientists' interviews): 9 of 33 correctly identified at 82% precision, with the true rate not fully verifiable. — [Lermen et al.](https://arxiv.org/pdf/2602.16800) [raw PDF]. Prior work recovered 6 of 24. — [Li, arXiv 2601.05918, as cited in Lermen et al.](https://arxiv.org/pdf/2602.16800) [raw PDF]
- Cost: "Running the agent on each profile costs us between $1–$4." Conclusion: "the practical obscurity protecting pseudonymous users online no longer holds." — [Lermen et al.](https://arxiv.org/pdf/2602.16800) [raw PDF]
- More content increases exposure: at 90% precision recall rises from 3.1% with one shared movie to 48.1% with ten or more. — [Lermen et al.](https://arxiv.org/pdf/2602.16800) [raw PDF]
- **Staab et al.**, ICLR 2024: LLMs infer attributes from real Reddit profiles with up to 85% top-1 accuracy, at 100x lower cost and 240x less time than humans; top-3 is reported as about 95–95.8% depending on the version. Text anonymization and model alignment were found ineffective. — [arXiv 2310.07298](https://arxiv.org/abs/2310.07298) [snippet]
- **Jiang et al. 2026** (preprint): 222,949 Philter-de-identified NYU Langone notes. Biological sex recovered at >99.7% accuracy; neighborhood AUC 78.35%; maximum individual re-identification risk 0.34%, about 37× the baseline of 0.0091%, called a conservative lower bound. "Safe Harbor was designed for an era of categorical tabular data." — [arXiv 2602.08997](https://arxiv.org/html/2602.08997v1) [fetch-summary]
- **Rocher et al. 2019:** a generative model estimates 99.98% of Americans would be correctly re-identified in any dataset with 15 demographic attributes. This is a modeled estimate, not an observed attack, and concerns structured data. — [Nature Communications, PMC6650473](https://pmc.ncbi.nlm.nih.gov/articles/PMC6650473) [snippet]
- **Psychiatric narrative:** Lim & Kim (Anonpsy, ACL 2026 Findings) argue "identifying signals are often embedded in narrative structure rather than limited to explicit identifiers," and that token-level masking "retains high semantic similarity, leaving substantial residual re-identification risk." Cosine similarity to the original was 0.902 for PHI masking vs 0.718 for their graph rewrite. Expert risk (1–5 scale): 1.540 vs 2.800 for LLM-only rewriting. Data: 90 published DSM-5-TR teaching cases, with only 10 cases in the expert study. — [arXiv 2601.13503](https://arxiv.org/html/2601.13503v2) [fetch-summary]
- Same paper: "there is no single standardized, dataset-agnostic metric for real-world re-identification risk." — [arXiv 2601.13503](https://arxiv.org/html/2601.13503v2) [fetch-summary]
- Practitioner opinion: unique situations, events, locations or timelines in therapy transcripts can enable re-identification even with names removed. This is commentary, not a regulatory finding. — [Person Centered Tech](https://personcenteredtech.com/de-identified-or-not-the-truth-about-hipaa-ai-and-client-data/) [snippet]

### Inferences
- Pseudonyms protect against casual reading, not against inference. "A woman in [city], whose brother died in the [event] at [employer]" is identifying to a neighbor and, increasingly, to an agent with web search.
- Risk rises with the factors listed in the question: rare events, relatives, workplaces and small towns all shrink the candidate pool, and Brazilian local news, obituaries, court records and social media offer linkage data. Lermen's curve suggests small pools are easier (90% recall at 10 candidates). Applying it to clinical text is an extrapolation.
- The longitudinal design makes this worse. A retrieved context combining many sessions accumulates quasi-identifiers, as the "more content" finding suggests, so per-note recall understates per-patient risk. A stable pseudonym across requests makes linkage straightforward.
- Key direct attacker limit: these attacks need the text first. If nothing is retained, the attacker must intercept or compel it, so ZDR and re-identification risks are complementary, not additive. A retained or leaked store is where the residual risk becomes real.
- The stronger defense, generalization or rewriting, costs clinical fidelity, which matters for a tool meant to preserve clinical nuance. Masking is the opposite trade-off.

### Gaps
- No empirical re-identification study of real psychotherapy notes, in any language, was found. Evidence is by analogy.
- No Brazil-specific study on quasi-identifiers, for example small-municipality populations.
- Anonpsy GPT-5 simulation values were in an unread appendix.
- Whether LGPD treats pseudonymized text as personal data was not verified here, and belongs to the legal stream. I expect it does, but this is from background knowledge, not a source checked in this work.

---

## Incidents and cases: what they show about contractual guarantees

### Takeaway
Deletion promises yielded to a court order within a live product (NYT v. OpenAI), and promised limits failed through conduct (BetterHelp) or security failure (Vastaamo). Contracts allocate liability after the fact; only data that does not exist or never left is protected from compulsion and breach.

### Cited Findings
- **NYT v. OpenAI, preservation.** The order at ECF 33 required OpenAI to "preserve and segregate all output log data that would otherwise be deleted on a going forward basis." — [Stipulation and Order, ECF 922, S.D.N.Y., 9 Oct 2025](https://cdn.arstechnica.net/wp-content/uploads/2025/10/NYT-v-OPenAI-Order-to-Terminate-OpenAIs-Preservation-Order-10-9-25.pdf) [raw PDF]. The original order is dated 13 May 2025. — [secondary summary](https://www.llms-for-lawyers.com/confidentiality/nyt-v-openai-deleted-chatgpt-chats-lawyers/) [snippet]
- The obligation "is terminated as of September 26, 2025," but OpenAI "will continue to preserve the output log data already preserved," except for requests from the EEA, Switzerland or UK, and will preserve going forward for accounts on listed domains "irrespective of originating location." — [ECF 922](https://cdn.arstechnica.net/wp-content/uploads/2025/10/NYT-v-OPenAI-Order-to-Terminate-OpenAIs-Preservation-Order-10-9-25.pdf) [raw PDF]. Note that the carve-out named European jurisdictions, not Brazil.
- ChatGPT Enterprise was excluded, per OpenAI. — [OpenAI post](https://openai.com/index/response-to-nyt-data-demands/) [snippet; page blocked]. **The carve-out for the ZDR API appears only in a secondary blog and is unverified.** — [nixm.ai](https://nixm.ai/learn/nyt-vs-openai-chat-logs-explained) [snippet]
- **20 million logs.** Judge Wang ordered production of a de-identified 20M-log sample in Nov 2025. On 5 Jan 2026 Judge Stein held her rulings "neither clearly erroneous nor contrary to law," and that she "adequately balanced ChatGPT users' privacy interests." De-identification and a protective order were the safeguards relied on. — [Bloomberg Law](https://news.bloomberglaw.com/litigation/openai-must-turn-over-20-million-chatgpt-logs-judge-affirms) [snippet]; [ABA Journal](https://www.abajournal.com/news/article/chatgpt-creator-must-turn-over-20m-chat-logs-in-copyright-litigation-federal-judge-says) [snippet]
- **CLOUD Act:** US providers must preserve or disclose data in their possession, custody or control "regardless of whether such communication, record, or other information is located within or outside of the United States." — [18 U.S.C. § 2713](https://www.law.cornell.edu/uscode/text/18/2713) [fetch-summary]
- **Mixpanel, Nov 2025:** an analytics subprocessor breach exposed API account names, emails, approximate location and organization IDs; OpenAI said chat content, keys and credentials were not affected. — [BleepingComputer](https://www.bleepingcomputer.com/news/security/openai-discloses-api-customer-data-breach-via-mixpanel-vendor-hack/) [snippet]; [OpenAI](https://openai.com/index/mixpanel-incident/) [snippet]
- **Vastaamo (Finland, 2020).** Prosecutors said a compromised credential gave access to the MySQL server; patients received ransom demands of €200 or €500 and about 20 paid. Kivimäki was convicted in April 2024, including nearly 21,000 aggravated blackmail attempts, sentence 6 years 3 months. — [Bank Info Security](https://www.bankinfosecurity.net/finnish-hacker-kivimaki-found-guilty-in-vastaamo-hack-a-24972) [snippet]; [The Record](https://therecord.media/finland-issues-wanted-notice-for-hacker-vastaamo-breach) [snippet]
- Regulator: €608,000 fine for neglecting secure processing and breach reporting, decision of 7 Dec 2021, under appeal when reported. — [EDPB national news](https://www.edpb.europa.eu/news/national-news/2022/administrative-fine-imposed-psychotherapy-centre-vastaamo-data-protection_en) [snippet]; [Roschier](https://www.roschier.com/newsroom/gdpr-enforcement-in-finland-latest-news) [snippet]
- The ex-CEO was convicted by the district court for failing to implement pseudonymisation and encryption, then the Helsinki Court of Appeal overturned the conviction in December 2025. — [Yle](https://yle.fi/a/74-20032537) [snippet]; [CyberMaterial](https://www.cybermaterial.com/p/court-clears-former-vastaamo-ceo) [snippet]
- Source conflicts: later reports disagree on Kivimäki's final sentence and release. — [Wikipedia](https://en.wikipedia.org/wiki/Vastaamo_data_breach) [snippet]. The "33,000 patients" figure came from a single blog and is uncorroborated here.
- **BetterHelp (FTC, final July 2023).** The company was "promising consumers that it would only use or disclose personal health data for limited purposes" while sending emails, IPs and health questionnaire data to Facebook, Snapchat, Criteo and Pinterest. The order imposes $7.8M, bans sharing health data for advertising, and requires deletion requests to third parties and a retention schedule. — [FTC](https://www.ftc.gov/news-events/news/press-releases/2023/07/ftc-gives-final-approval-order-banning-betterhelp-sharing-sensitive-health-data-advertising) [fetch-summary]

### Inferences
- The NYT case's main lesson is that **a deletion commitment is subordinate to legal process, including in civil litigation unrelated to the customer**, and users had no party status. All five providers' exceptions ("required by law") reserve exactly this.
- A true zero-retention path would have nothing to preserve, which is its real value. That is an architectural property rather than a contractual promise, and it holds only while the path is not reconfigured. Whether a court could order prospective logging on a ZDR endpoint is untested in what I found.
- The geographical carve-out shows protection tracked jurisdiction-specific leverage. A Brazilian clinic should not assume equivalent treatment.
- De-identification functioned as a legal justification for disclosure in the 20M logs ruling: pseudonymization can lower the barrier to a compelled release, not only raise it.
- Vastaamo shows why psychotherapy data is a distinct class: harm occurs to patients one by one through extortion, and a fine on the company does nothing to reverse disclosure. It also shows that **on-premises or self-operated systems are not automatically safer**, since the failure was basic operator security.
- BetterHelp shows the failure mode of promises is often ordinary business conduct, detected by a regulator years later. Mixpanel shows metadata about the customer itself can leak through subprocessors, even with no content exposure. For a clinic, the account identity alone could be sensitive.

### Gaps
- No public incident found of a major LLM API provider leaking prompt content held under ZDR. This may reflect absence of events or absence of disclosure, so it is not evidence of safety.
- Outcome of the Vastaamo administrative appeal, and any further appeal after December 2025, not found.
- Current status of the NYT logs dispute after January 2026 not established.
- No Brazilian court or ANPD case on LLM provider logs was found.

---

## Alternative architectures: on-prem GPU, confidential computing, private endpoints

### Takeaway
Private endpoints only change the network path. Confidential computing can reduce operator access, with modest overhead, but excludes physical attackers and is not available as a mainstream frontier API. On-prem removes third-party retention, abuse flagging, international transfer and foreign legal reach, and a single GPU looks sufficient for a small clinic, at the price of weaker models and full security responsibility.

### Cited Findings

#### Private endpoints
- AWS PrivateLink is described as a way to configure a VPC "so that your data isn't available over the internet." — [Bedrock VPC](https://docs.aws.amazon.com/bedrock/latest/userguide/usingVPC.html) [raw]
- "A private endpoint locks down traffic going into Azure AI Foundry. It does nothing about what your agents call out to." — [Microsoft Azure Architecture Blog](https://techcommunity.microsoft.com/blog/azurearchitectureblog/your-private-endpoint-does-not-cover-agent-egress-locking-down-azure-ai-foundry-/4547864) [snippet]
- OpenAI offers Private Link from Azure workloads to regional API endpoints. — [OpenAI Private Link](https://developers.openai.com/api/docs/guides/private-link) [snippet]

#### Confidential computing
- Azure H100 confidential VMs are GA, with encrypted CPU-GPU traffic and GPU attestation. — [Microsoft](https://techcommunity.microsoft.com/blog/azureconfidentialcomputingblog/general-availability-azure-confidential-vms-with-nvidia-h100-tensor-core-gpus/4242644) [snippet]
- Azure confidential inferencing launched as a Whisper preview; GA status could not be confirmed. — [Microsoft](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/azure-ai-confidential-inferencing-preview/4248181) [snippet]
- Overhead on H100 TEE mode: average under 9% in the later study version, near zero for the largest models tested. — [arXiv 2409.03992](https://arxiv.org/html/2409.03992v4) [snippet]. Another paper reports 4–8% throughput penalty. — [arXiv 2509.18886](https://api.emergentmind.com/papers/2509.18886) [snippet]
- **TEE.fail (2025):** a DDR5 interposer built for under $1,000 extracted attestation keys from Intel TDX and affected AMD SEV-SNP; extracted keys can undermine NVIDIA GPU confidential computing attestation. It needs physical access and root. Vendors treat physical bus attacks as out of scope, though reports differ on emphasis. — [SecurityWeek](https://www.securityweek.com/new-attack-targets-ddr5-memory-to-steal-keys-from-intel-and-amd-tees/amp/) [snippet]; [SC World](https://www.scworld.com/brief/intel-amd-processor-stored-secrets-threatened-by-novel-tee-fail-intrusion) [snippet]
- Verifiable designs: Apple Private Cloud Compute describes stateless processing and published images for independent inspection. — [Apple Security](https://security.apple.com/blog/private-cloud-compute/) [snippet]. Google Private AI Compute is a similar announced design. — [Google](https://blog.google/technology/ai/google-private-ai-compute/) [snippet]. Both target their own consumer products rather than a general clinical API, as far as I could determine.
- An open-source design for confidential LLM serving exists. — [OpenPCC, arXiv 2606.11145](https://arxiv.org/html/2606.11145v1) [snippet]

#### On-prem GPU (low-quality sources; blogs and individual benchmarks)
- 16 GB RTX 4080 via Ollama: gpt-oss 20B about 140 tokens/s; Qwen3 14B about 62 tokens/s; gpt-oss 120B (66 GB) offloaded drops to about 12.6 tokens/s. — [glukhov.org](https://www.glukhov.org/post/2026/01/choosing-best-llm-for-ollama-on-16gb-vram-gpu/) [snippet]
- RTX 4090: Gemma 4 26B about 150 tokens/s vs under 8 for dense 31B, as one user reports. — [DEV](https://dev.to/amit_raz_4280cb3a49bb4086/i-ran-googles-new-gemma-4-models-locally-26b-and-31b-heres-what-i-found-4o2g) [snippet]
- 70B-class at Q4 needs roughly 40–45 GB VRAM, beyond a 24 GB card; dual RTX 3090s give about 16–45 tokens/s. Sources conflict on whether a single 4090 suffices. — [fungies.io](https://fungies.io/?p=40579) [snippet]; [dev.to/runaihome](https://dev.to/jovan_chan_9500711396d4e6/llama-33-70b-at-home-real-hardware-cost-vs-cloud-api-math-2026-gln) [snippet]
- Cost: one example at 100K tokens/day gives about $5,553 local in year one vs $6,300 cloud, highly assumption-dependent. — [fungies.io](https://fungies.io/?p=40097) [snippet]. A general guideline puts break-even around 10M+ tokens/day. — [enterno.io](https://enterno.io/en/s/research-ai-cost-trends-2026) [snippet]

### Inferences

| Control | Stops provider retention | Stops flag-triggered review | Avoids international transfer | Stops foreign legal reach | Stops network interception | Main cost |
|---|---|---|---|---|---|---|
| Private endpoint | No | No | No | No | Partly | Low |
| Brazil region | No | No | Yes where available | No | No | Older models |
| ZDR | Mostly | No | No | Partly | No | Sales access; model limits |
| Pseudonymization | No | No | No | No, but limits content value | No | Recall gaps, fidelity |
| Confidential computing, customer-run | Yes, in design | Yes, if customer-run | Depends on region | Partly | Yes | Not a frontier API; physical-attack limit |
| On-prem | Yes | Yes | Yes | Yes for foreign providers | Local responsibility | Model quality, operations |

- This table is my reasoning from the findings above, not a sourced comparison.
- **Sizing estimate for a small clinic (illustrative):** assume 8 sessions a day per professional, each producing a generation of about 500 tokens. At 30 tokens/s that is about 17 seconds per result, so one 16–24 GB GPU running a 14–26B model with a queue seems adequate. Long-context synthesis over many sessions would be slower, and volume must be measured.
- Clinic-scale volume is far below the 10M tokens/day guideline, so **cost does not favor on-prem**; privacy risk reduction is the justification. These cost figures should not be cited as evidence in the TCC without better sources.
- De-identification must run locally in any scenario, since sending text to a cloud detector would defeat its purpose. So a local GPU or CPU pipeline is needed even in a cloud-hybrid design.
- Local-first also matches the project's existing constraints: AGENTS.md fixes Ollama in the stack and requires explicit failure, and any cloud path would need an ADR under its change-control rule.
- Confidential computing's threat model suits "protect from the operator," but the operator-of-record still runs classifiers if it offers a managed frontier API. Only a customer-operated enclave with open weights changes this.

### Gaps
- No peer-reviewed comparison of open-weight models on Portuguese psychotherapy documentation; the quality gap against frontier models for this task is unmeasured.
- No reliable Brazilian GPU pricing, power, or staffing cost data for clinics; no Brazil-region availability check for confidential GPU VMs.
- No vendor found offering attested confidential inference of frontier proprietary models as a general API.
- Measured overhead benchmarks are 2024–2025 on older models.

---

## Overall assessment: is "pseudonymize + ZDR contract" a sound control?

### Takeaway
No, not as the sole or primary control for psychotherapy notes. It is useful as a risk-reduction layer, but neither half meets the claim usually made for it. Pseudonymization leaves data identifiable and ZDR has exceptions that fall on the most sensitive notes.

### Cited Findings
- Contractual side: ZDR is approval-gated at OpenAI, Anthropic and Azure ([OpenAI](https://developers.openai.com/api/docs/guides/your-data), [Anthropic](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention), [Azure](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/openai/limited-access)); it excludes legal and, at Anthropic, flagged retention ([Anthropic](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention)); and it is unavailable for top-tier models without special authorization ([Anthropic](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention), [AWS](https://docs.aws.amazon.com/bedrock/latest/userguide/abuse-detection.html)).
- Technical side: Portuguese recall is about 0.93 overall with very low scores for organizations and locations ([Schiezaro et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC12813187/)); token masking leaves psychiatric narratives highly similar to the originals ([Lim & Kim](https://arxiv.org/html/2601.13503v2)); and LLM agents re-identify from partially redacted transcripts ([Lermen et al.](https://arxiv.org/pdf/2602.16800)).
- Precedent: a retention promise gave way to a court order ([ECF 922](https://cdn.arstechnica.net/wp-content/uploads/2025/10/NYT-v-OPenAI-Order-to-Terminate-OpenAIs-Preservation-Order-10-9-25.pdf)).

### Inferences
- **What the combination does achieve:** it removes training use, reduces routine storage and human access, narrows the breach window, and limits casual exposure. Those are real gains over an unmanaged API.
- **What it cannot be claimed to achieve:** anonymity, "no retention," guaranteed no human access, data staying in Brazil with frontier models, or independence from foreign legal process. The project's AGENTS.md already forbids equivalent claims (NER does not guarantee anonymity; local processing is not automatic LGPD compliance).
- **Minimum conditions if a cloud path were ever considered, for the writer's discussion:** a signed ZDR-class arrangement covering the specific model and endpoint; verification of the configuration (such as Azure `ContentLogging`, Bedrock `none` with an SCP, Vertex logging and cache off); stateful features disabled; ANPD SCCs in place; measured local recall on synthetic Portuguese notes; flag-rate tests on synthetic crisis content; non-persistent, per-request pseudonyms; minimal context; and a documented decision on what happens when the model tier changes.
- **Which layers give meaningful improvement:** not sending clinical text at all gives the largest step. Excluding the highest-risk content types from cloud paths is next. Network controls and region selection are the smallest.

### Gaps
- Provider-side verification is limited: customers generally cannot audit in-memory handling, and only Azure and Bedrock document a customer-visible check among those read.
- Whether ANPD, CFP or Brazilian courts would accept this combination as adequate for psychotherapy records was outside this stream and is unresolved.
