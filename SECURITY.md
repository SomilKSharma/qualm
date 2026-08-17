# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 2.1.x | yes |
| < 2.1 | no — deprecated on npm |

## Reporting a vulnerability

Report privately through
[GitHub Security Advisories](https://github.com/SomilKSharma/qualm/security/advisories/new),
or by email to iamsomilsharma@gmail.com. Please do not open a public issue for
a vulnerability.

Expect an acknowledgement within 72 hours and an assessment within a week.

## Threat model

qualm runs inside CI, reads source files, and shells out to `git` when
`--diff-branch` is used. The inputs worth thinking about are file contents,
paths, and the branch name — the last of which arrives from the CI environment
and may be attacker-controlled on a pull request from a fork.

Arguments to `git` are passed as an argument array via `execFileSync`, never
interpolated into a shell string. Versions before 2.1.0 built the command as a
template literal, so a crafted branch name could execute arbitrary commands on
the runner. If you run qualm with `--diff-branch` on untrusted pull requests,
upgrade to 2.1.0 or later.

qualm parses source; it never executes it. It makes no network requests.
