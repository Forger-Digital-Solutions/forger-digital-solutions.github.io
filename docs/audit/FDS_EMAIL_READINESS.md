# FDS Email Infrastructure Readiness & Architecture Audit

## 1. Operational State Assessment

- **Current Active Public Mailbox**: `forgerdigisolsupport@gmail.com`
- **Primary Domain**: `forgerdigitalsolutions.com`
- **Domain Verification Status**: Pending setup on DNS provider
- **Operational Fail-Safe**: Centralized configuration (`src/config/email.ts`) routes all role inquiries (`support`, `billing`, `security`, `contact`) to the proven working mailbox `forgerdigisolsupport@gmail.com`.

---

## 2. Centralized Role-Based Routing Architecture

In `src/config/email.ts`, FDS defines standard operational roles with structured readiness states:

| Role | Target Branded Address | Active Routing Address | Status | Primary Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **support** | `support@forgerdigitalsolutions.com` | `forgerdigisolsupport@gmail.com` | `pending_domain_verification` | Technical support, bug reports, and user assistance |
| **billing** | `billing@forgerdigitalsolutions.com` | `forgerdigisolsupport@gmail.com` | `pending_domain_verification` | Commercial licenses, invoice inquiries, entitlement audits |
| **security** | `security@forgerdigitalsolutions.com` | `forgerdigisolsupport@gmail.com` | `pending_domain_verification` | Vulnerability disclosure and security advisories |
| **contact** | `contact@forgerdigitalsolutions.com` | `forgerdigisolsupport@gmail.com` | `pending_domain_verification` | General studio inquiries, partnerships, and press |

### Routing Fallback Logic
The helper function `getActiveEmail(role)` returns `route.activeAddress` only if `route.status === 'active'`. In all other cases (`pending_domain_verification`, `planned`), it reliably resolves to `emailConfig.activeFallbackEmail` (`forgerdigisolsupport@gmail.com`).

---

## 3. External DNS Prerequisites (For When Custom Domain Email Is Activated)

> [!IMPORTANT]
> **Zero Fabrication Policy**: No fake SPF/DKIM/DMARC TXT records or dummy MX records are published to DNS or hardcoded in production templates. The specifications below define the prerequisites for the studio administrator to configure at the DNS registrar when activating Google Workspace, Fastmail, Proton, or another mail host.

### A. MX Records (Mail Exchange)
When activating a mail host (e.g. Google Workspace), configure MX records on `forgerdigitalsolutions.com`:
```text
Priority  Host  Points to
1         @     ASPMX.L.GOOGLE.COM.
5         @     ALT1.ASPMX.L.GOOGLE.COM.
5         @     ALT2.ASPMX.L.GOOGLE.COM.
10        @     ALT3.ASPMX.L.GOOGLE.COM.
10        @     ALT4.ASPMX.L.GOOGLE.COM.
```
*(Or the equivalent MX records provided by the chosen email hosting service).*

### B. SPF (Sender Policy Framework) TXT Record
A single SPF record must be established at the domain root (`@`):
```text
Host: @
Type: TXT
Value: v=spf1 include:_spf.google.com ~all
```
*(Adjust the include mechanism according to the selected email provider. Do NOT create multiple SPF TXT records).*

### C. DKIM (DomainKeys Identified Mail)
Generate a 2048-bit DKIM keypair inside the email host console, then publish the selector TXT record:
```text
Host: [selector]._domainkey.forgerdigitalsolutions.com
Type: TXT
Value: v=DKIM1; k=rsa; p=[PUBLIC_KEY_PROVIDED_BY_MAIL_HOST]
```

### D. DMARC (Domain-based Message Authentication, Reporting, and Conformance)
Publish a DMARC policy under the `_dmarc` subdomain.
- **Stage 1 (Monitoring)**:
  ```text
  Host: _dmarc
  Type: TXT
  Value: v=DMARC1; p=none; rua=mailto:forgerdigisolsupport@gmail.com; pct=100; sp=none; aspf=r; adkim=r;
  ```
- **Stage 2 (Enforcement after report verification)**:
  ```text
  Host: _dmarc
  Type: TXT
  Value: v=DMARC1; p=quarantine; rua=mailto:forgerdigisolsupport@gmail.com; pct=100;
  ```

---

## 4. Certification & Security Posture
- All active site links (`mailto:`) continue to use `forgerdigisolsupport@gmail.com`.
- No user emails or support requests are lost in unrouted or unverified inboxes.
- Once DNS records are active and tested with inbound/outbound handshakes, the status entries in `src/config/email.ts` can be toggled to `active`.
