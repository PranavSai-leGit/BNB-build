# CogniLab Privacy, GDPR & Ethics Framework

CogniLab is architected from the ground up on **Privacy-by-Design** principles aligned with the European Union General Data Protection Regulation (GDPR) and academic Institutional Review Board (IRB) ethics standards.

---

## 1. Core Privacy-by-Design Principles

### A. Data Minimization
- **No Participant Accounts**: Participants access published studies via pseudonymous links without creating accounts, providing names, or registering email addresses.
- **No Unnecessary Fingerprinting**: The participant runtime avoids aggressive device fingerprinting or advertising SDKs.
- **Sensitive Field Warning**: When researchers create demographic fields containing potentially identifying keywords (such as `name`, `email`, `phone`, `ssn`, `address`), the visual builder displays a warning reminding researchers to adhere to institutional review standards.

### B. Purpose Limitation & Pseudonymization
- **Randomized Pseudonym Generation**: Every session generates a cryptographically secure pseudonym (e.g., `P-8F123A`).
- **Separation of Contact Data from Research Data**: If contact information is required for participant compensation, it is isolated from experimental reaction-time and accuracy logs.

### C. Transparency & Informed Consent
- Researchers can configure study title, research purpose, duration, risks, benefits, and contact details.
- Consent records store:
  - Session ID
  - Consent version
  - Explicit acceptance boolean
  - UTC timestamp
  - Withdrawal status

### D. Voluntary Participation & Right to Withdraw
- Participants are informed of their right to withdraw.
- A "Withdraw from Study" button is visible during the session. If clicked, the session is marked `withdrawn`, the consent record is updated, an audit log entry is recorded, and the trial response data is purged.

---

## 2. Configurable Data Retention Policies

Each experiment possesses an explicit data retention policy (e.g., 30 days, 90 days, 1 year):
- The policy is communicated to participants on the informed consent page.
- Experiments and associated participant records can be deleted or archived at any time by authorized researchers.

---

## 3. Auditability & Access Control

- **Role-Based Authorization**: Distinct roles for Researcher, Organization Admin, and Platform Admin.
- **Organization Isolation**: Experiments and collected datasets are strictly scoped to the researcher's organization.
- **Cryptographic Audit Logs**: Captures experiment creation, publication, consent changes, deletion, and dataset exports with timestamps and actor emails.
